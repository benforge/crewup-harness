import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";
import { readRunState, writeRunState } from "./lib/run-lifecycle.mjs";
import { collectWorkspaceChanges, configureDelegationGuard, isBusinessCodePath } from "./lib/delegation-guard.mjs";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { loadGeneratedMarkdownSchema, validateGeneratedMarkdownFile } from "./lib/generated-markdown.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const passthrough = args.filter((arg) => arg.startsWith("--"));
const generatedMarkdownSchema = await loadGeneratedMarkdownSchema(root);

if (!runId) {
  console.error("Please provide runId, for example: npx crewup finish <run-id>");
  process.exit(1);
}

const currentState = await readRunState(root, runId).catch(() => null);
if (currentState?.workflowProfile === "lite-v2") {
  await finishLiteV2(currentState);
  process.exit(0);
}
if (currentState?.workflowProfile === "plan_only") {
  await finishNoCodeRun(currentState, {
    label: "plan",
    requiredFiles: ["planning.md", "acceptance.md", "architecture-plan.md", "implementation-plan.md", "review.md", "validation.md", "summary.md"]
  });
  process.exit(0);
}
if (currentState?.workflowProfile === "discovery") {
  await finishNoCodeRun(currentState, {
    label: "discovery",
    requiredFiles: ["discovery.md", "module-map.md", "tech-map.md", "risk-map.md", "next-runs.md", "review.md", "summary.md"]
  });
  process.exit(0);
}

console.log(`Finishing run: ${runId}`);
console.log("CrewUp will run the done gate, product sync, archive summary, and archive commit when policy allows it.");

const transition = spawnSync(process.execPath, [
  resolveScriptPath(root, "transition.mjs"),
  runId,
  "--to=done",
  ...passthrough
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

if ((transition.status ?? 1) !== 0) process.exit(transition.status ?? 1);

const archive = spawnSync(process.execPath, [
  resolveScriptPath(root, "archive.mjs"),
  runId,
  "--outcome=success",
  "--reason=run reached done"
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

process.exit(archive.status ?? 1);

async function finishLiteV2(state) {
  const runDir = path.join(root, ".harness", "runs", runId);
  const missing = [];
  const pending = [];
  for (const file of ["spec.md", "tasks.md", "validation.md", "summary.md"]) {
    if (!existsSync(path.join(runDir, file))) missing.push(file);
    else {
      const formatProblems = await validateGeneratedMarkdownFile({ root, runId, file, schema: generatedMarkdownSchema });
      if (formatProblems.length > 0) pending.push(...formatProblems);
    }
  }
  if (missing.length > 0) {
    console.error(`Cannot finish lite-v2 run: missing ${missing.join(", ")}`);
    process.exit(1);
  }

  const validation = await readFile(path.join(runDir, "validation.md"), "utf8");
  const summary = await readFile(path.join(runDir, "summary.md"), "utf8");
  if (/status:\s*pending/i.test(validation) || /\|\s*pending\s*\|\s*pending\s*\|/i.test(validation)) pending.push("validation.md");
  if (/Outcome\s*\n\s*\n-\s*pending/i.test(summary) || /Changed Files\s*\n\s*\n-\s*pending/i.test(summary)) pending.push("summary.md");
  if (pending.length > 0) {
    console.error(`Cannot finish lite-v2 run: update ${pending.join(", ")} before finishing.`);
    console.error("Lite-v2 is lightweight, but it still requires recorded validation and summary evidence.");
    process.exit(1);
  }

  await writeRunState(root, runId, {
    ...state,
    stage: "done",
    status: "active",
    outcome: "none",
    nextAction: {
      type: "archive",
      description: "Lite-v2 validation and summary are recorded; archive success.",
      command: `npx crewup archive ${runId} --outcome=success --reason=lite-v2 complete`
    }
  });

  const archive = spawnSync(process.execPath, [
    resolveScriptPath(root, "archive.mjs"),
    runId,
    "--outcome=success",
    "--reason=lite-v2 complete"
  ], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  process.exit(archive.status ?? 1);
}

async function finishNoCodeRun(state, { label, requiredFiles }) {
  const runDir = path.join(root, ".harness", "runs", runId);
  const { project_profile: projectProfile } = await loadProjectProfile(root);
  configureDelegationGuard(projectProfile);
  const missing = [];
  const pending = [];
  for (const file of requiredFiles) {
    const target = path.join(runDir, file);
    if (!existsSync(target)) {
      missing.push(file);
      continue;
    }
    const content = await readFile(target, "utf8");
    const formatProblems = await validateGeneratedMarkdownFile({ root, runId, file, schema: generatedMarkdownSchema });
    if (formatProblems.length > 0) pending.push(...formatProblems);
    if (hasPendingNoCodeContent(content)) pending.push(file);
  }

  if (missing.length > 0 || pending.length > 0) {
    console.error(`Cannot finish ${label} run: evidence is incomplete.`);
    if (missing.length > 0) console.error(`- missing: ${missing.join(", ")}`);
    if (pending.length > 0) console.error(`- still pending: ${pending.join(", ")}`);
    console.error(`${label} runs are no-code, but they still require complete planning/discovery evidence before success.`);
    process.exit(1);
  }

  const businessChanges = collectWorkspaceChanges(root, runId, state).filter(isBusinessCodePath);
  if (businessChanges.length > 0) {
    console.error(`Cannot finish ${label} run: no-code mode detected business code changes.`);
    console.error(`- changed business files: ${businessChanges.join(", ")}`);
    console.error("Create or continue an implementation run with --mode=lite or --mode=strict instead.");
    process.exit(1);
  }

  await writeRunState(root, runId, {
    ...state,
    stage: "done",
    status: "active",
    outcome: "none",
    nextAction: {
      type: "archive",
      description: `${label} evidence is complete; archive success.`,
      command: `npx crewup archive ${runId} --outcome=success --reason=${label} complete`
    }
  });

  const archive = spawnSync(process.execPath, [
    resolveScriptPath(root, "archive.mjs"),
    runId,
    "--outcome=success",
    `--reason=${label} complete`
  ], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  process.exit(archive.status ?? 1);
}

function hasPendingNoCodeContent(content) {
  const text = String(content ?? "");
  return /(^|\n)\s*-\s*pending\s*($|\n)/i.test(text)
    || /status:\s*pending/i.test(text)
    || /\[\s\]\s*No business code changes were made/i.test(text)
    || /\bTBD\b|\bTODO\b|待补|未完成|待完善/i.test(text);
}
