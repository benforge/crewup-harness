import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  nativeExecutionProblems,
  requiredNativeAgentsForStageCompletion
} from "./lib/delegation-guard.mjs";
import { hasTemplatePlaceholder } from "./lib/placeholder-detector.mjs";
import { isLiteImplementationOnlyAgentSet } from "./lib/agent-roles.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");
const selectedAgentsArg = args.find((arg) => arg.startsWith("--agents="));

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:next -- <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const statePath = path.join(runDir, "state.json");
if (!existsSync(statePath)) {
  console.error(`Missing state.json: ${path.relative(root, statePath)}`);
  process.exit(1);
}

const workflow = parseYaml(await readFile(path.join(root, ".harness", "config", "workflow.yaml"), "utf8")).workflow;
const artifactSchema = parseYaml(await readFile(path.join(root, ".harness", "config", "artifact-schema.yaml"), "utf8")).artifacts ?? {};
const state = JSON.parse(await readFile(statePath, "utf8"));
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs");
const artifactsDir = path.join(runDir, "artifacts");

const currentAgents = selectedAgentsArg
  ? selectedAgentsArg.replace("--agents=", "").split(",").map((item) => item.trim()).filter(Boolean)
  : await taskAgents();

const commands = [];
const notes = [];
const blockers = [];
const warnings = [];
const artifactHealth = await inspectArtifacts();
const nativeHealth = inspectNativeState();
const stageAgentHealth = inspectStageAgentHealth();
const changedFiles = inferChangedFilesPreview();

if (state.stage === "done") {
  commands.push(["npm", ["run", "harness:gate-check", "--", runId], "recheck done gate"]);
} else if (!existsSync(tasksDir) || currentAgents.length === 0) {
  commands.push(["npm", ["run", "harness:prepare-run", "--", runId], "generate current-stage agent tasks"]);
} else {
  const agentsArg = currentAgents.join(",");
  if (!hasContextForAgents(currentAgents)) {
    commands.push(["npm", ["run", "harness:context-pack", "--", runId, `--agents=${agentsArg}`], "generate compact context pack"]);
  }
  if (!hasNativePlanForAgents(currentAgents)) {
    commands.push(["npm", ["run", "harness:native-plan", "--", runId, `--agents=${agentsArg}`], "generate native subagent plan"]);
  }
}

commands.push(["npm", ["run", "harness:token-ledger", "--", runId], "generate token ledger"]);

if (state.stage === "done") {
  commands.push(["npm", ["run", "harness:changed-files", "--", runId, "infer"], "infer unrecorded changes"]);
  commands.push(["npm", ["run", "harness:archive-commit", "--", runId, "--dry-run"], "preview archive commit"]);
}

notes.push(...stageNotes(state.stage, currentAgents));
blockers.push(...artifactHealth.blockers, ...nativeHealth.blockers, ...stageAgentHealth.blockers);
warnings.push(...artifactHealth.warnings, ...nativeHealth.warnings, ...stageAgentHealth.warnings);
if (changedFiles.candidates.length > 0) {
  warnings.push(`Detected ${changedFiles.candidates.length} candidate change(s) not yet recorded in changed-files manifest.`);
}

const nextTransition = suggestTransition(state.stage, artifactHealth, nativeHealth, stageAgentHealth);
if (nextTransition) commands.unshift(nextTransition);

console.log(`# Harness Next: ${runId}`);
console.log("");
console.log(`- current stage: ${state.stage}`);
console.log(`- current status: ${state.status}`);
console.log(`- apply: ${apply ? "yes" : "no"}`);
console.log("");

console.log("## Diagnostics");
console.log("");
console.log(`- artifacts: ${artifactHealth.ready}/${artifactHealth.total} ready`);
console.log(`- native: open=${nativeHealth.open}, running=${nativeHealth.running}, waiting_review=${nativeHealth.waitingReview}, blocked=${nativeHealth.blocked}`);
console.log(`- required agents for current stage completion: ${stageAgentHealth.required.length ? stageAgentHealth.required.join(", ") : "(none)"}`);
console.log(`- changed-files candidates: ${changedFiles.candidates.length}`);
console.log("");

if (blockers.length) {
  console.log("## Blockers");
  for (const item of blockers) console.log(`- ${item}`);
  console.log("");
}

if (warnings.length) {
  console.log("## Warnings");
  for (const item of warnings) console.log(`- ${item}`);
  console.log("");
}

if (commands.length) {
  console.log("## Suggested Commands");
  for (const [bin, commandArgs, reason] of commands) {
    console.log(`- ${[bin, ...commandArgs].join(" ")} # ${reason}`);
  }
  console.log("");
}

if (notes.length) {
  console.log("## Next Notes");
  for (const note of notes) console.log(`- ${note}`);
  console.log("");
}

if (!apply) {
  console.log("No commands executed. To run suggested commands:");
  console.log(`npm run harness:next -- ${runId} --apply`);
  process.exit(0);
}

for (const [bin, commandArgs, reason] of commands) {
  console.log(`\n> ${[bin, ...commandArgs].join(" ")}\n# ${reason}`);
  const result = spawnSync(bin, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function taskAgents() {
  if (!existsSync(tasksDir)) return [];
  const entries = await readdir(tasksDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".task.md"))
    .map((entry) => entry.name.replace(/\.task\.md$/, ""))
    .sort();
}

function hasContextForAgents(agents) {
  if (!existsSync(path.join(logsDir, "context", "artifact-index.md"))) return false;
  return agents.every((agent) => existsSync(path.join(logsDir, "context", `${agent}.md`)));
}

function hasNativePlanForAgents(agents) {
  const planPath = path.join(logsDir, "native-subagents", "native-subagent-plan.json");
  if (!existsSync(planPath)) return false;
  try {
    const plan = JSON.parse(readFileSyncUtf8(planPath));
    const planned = new Set((plan.tasks ?? []).map((task) => task.agent));
    return agents.every((agent) => planned.has(agent));
  } catch {
    return false;
  }
}

async function inspectArtifacts() {
  const required = requiredArtifactsForStage(state.stage);
  const result = { total: required.length, ready: 0, blockers: [], warnings: [] };
  for (const file of required) {
    const target = path.join(artifactsDir, file);
    if (!existsSync(target)) {
      result.blockers.push(`Missing artifact: ${file}`);
      continue;
    }
    const content = await readFile(target, "utf8");
    const missingHeadings = (artifactSchema[file]?.required_headings ?? []).filter((heading) => !hasAnyHeading(content, headingAliases(heading)));
    if (missingHeadings.length > 0) {
      result.blockers.push(`${file} missing headings: ${missingHeadings.join(", ")}`);
      continue;
    }
    if (hasPlaceholder(content)) {
      result.warnings.push(`${file} still appears to contain placeholders.`);
      continue;
    }
    result.ready += 1;
  }
  return result;
}

function inspectNativeState() {
  const nativePath = path.join(logsDir, "native-subagents", "native-state.json");
  const result = { open: 0, running: 0, waitingReview: 0, blocked: 0, blockers: [], warnings: [] };
  if (!existsSync(nativePath)) {
    if (currentAgents.length > 0) result.warnings.push("native-state.json has not been generated yet; run native-plan first.");
    return result;
  }
  try {
    const native = JSON.parse(readFileSyncUtf8(nativePath));
    const agents = native.agents ?? [];
    result.open = agents.filter((agent) => agent.status !== "closed").length;
    result.running = agents.filter((agent) => agent.status === "running").length;
    result.waitingReview = agents.filter((agent) => agent.status === "waiting_review").length;
    result.blocked = agents.filter((agent) => ["blocked", "needs_input", "error"].includes(agent.status)).length;
    for (const agent of agents) {
      if (agent.status === "running") result.warnings.push(`Subagent still running: ${agent.agent}`);
      if (["blocked", "needs_input", "error"].includes(agent.status)) result.blockers.push(`Subagent needs attention: ${agent.agent}:${agent.status}`);
      if (agent.status === "ready_to_close" && !agent.close_confirmed) result.warnings.push(`Subagent ready_to_close but not closed: ${agent.agent}`);
    }
  } catch {
    result.blockers.push("native-state.json cannot be parsed.");
  }
  return result;
}

function inspectStageAgentHealth() {
  const required = requiredNativeAgentsForStageCompletion(state.stage, {
    root,
    runId,
    state,
    taskAgents: currentAgents
  });
  const result = { required, blockers: [], warnings: [] };
  if (required.length === 0) return result;

  const nativePath = path.join(logsDir, "native-subagents", "native-state.json");
  if (!existsSync(nativePath)) {
    result.blockers.push(`Stage ${state.stage} requires native agent results, but native-state.json is missing: ${required.join(", ")}`);
    return result;
  }

  try {
    const native = JSON.parse(readFileSyncUtf8(nativePath));
    result.blockers.push(...nativeExecutionProblems({
      nativeState: native,
      requiredAgents: required,
      label: state.stage
    }));
  } catch {
    result.blockers.push("native-state.json cannot be parsed; cannot verify stage closure.");
  }

  return result;
}

function inferChangedFilesPreview() {
  const result = spawnSync("npm", ["run", "harness:changed-files", "--", runId, "infer"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  const lines = result.stdout?.split(/\r?\n/) ?? [];
  const candidates = [];
  let inExcluded = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "Excluded:") {
      inExcluded = true;
      continue;
    }
    if (!inExcluded && line.startsWith("- ") && !line.includes("\u65e0\u5019\u9009\u4e1a\u52a1\u53d8\u66f4")) {
      candidates.push(line);
    }
  }
  return { candidates };
}

function suggestTransition(stage, artifactHealth, nativeHealth, agentHealth) {
  if (blockers.length > 0 || agentHealth.blockers.length > 0 || nativeHealth.running > 0) return null;
  if (stage === "requirements_plan" && isLiteImplementationOnlyRun()) {
    return ["npm", ["run", "harness:transition", "--", runId, "--to=implement", "--approve-implementation"], "lite run may enter implementation"];
  }
  const allowedNext = workflow.transitions?.[stage]?.allowed_next ?? [];
  const next = allowedNext[0];
  if (!next) return null;
  if (artifactHealth.total > 0 && artifactHealth.ready < artifactHealth.total) return null;
  if (stage === "plan" && next === "implement") {
    if (isNoCodeWorkflow()) return null;
    return ["npm", ["run", "harness:transition", "--", runId, "--to=implement", "--approve-implementation"], "planning artifacts look ready; implementation still requires user approval"];
  }
  return ["npm", ["run", "harness:transition", "--", runId, `--to=${next}`], `try transition to ${next}`];
}

function isLiteImplementationOnlyRun() {
  return isLiteImplementationOnlyAgentSet(currentAgents, state.workflowProfile);
}

function isNoCodeWorkflow() {
  return ["discovery", "plan_only"].includes(state.workflowProfile) || ["discovery", "plan_only"].includes(state.runType);
}

function requiredArtifactsForStage(stage) {
  if (stage === "requirements_plan" && isLiteImplementationOnlyRun()) return [];
  const byStage = {
    requirements_plan: ["requirement-plan.md"],
    requirements_confirm: ["requirement-plan.md"],
    plan: ["requirement.md"],
    implement: isLiteImplementationOnlyRun() ? [] : ["requirement.md", "architecture.md", "implementation-plan.md"],
    verify: ["test-report.md"],
    review: ["test-report.md", "review-report.md"],
    release: ["review-report.md", "release-summary.md"],
    done: ["test-report.md", "review-report.md", "release-summary.md"]
  };
  return byStage[stage] ?? [];
}

function hasPlaceholder(content) {
  return hasTemplatePlaceholder(content);
}

function hasAnyHeading(content, headings) {
  return headings.some((heading) => new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m").test(content));
}

function headingAliases(heading) {
  return [heading];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stageNotes(stage, agents) {
  const allowedNext = workflow.transitions?.[stage]?.allowed_next ?? [];
  const result = [];
  if (stage === "done") {
    result.push("Run is done; recheck gates, inspect token ledger, or preview archive commit.");
    return result;
  }
  if (isNoCodeWorkflow()) {
    result.push("This is a planning-only run; stop after requirements, architecture, and review artifacts. Create a separate implementation run for code changes.");
  }
  if (agents.length > 0) {
    result.push(`Current task agents: ${agents.join(", ")}`);
    result.push("This script does not spawn subagents. The main agent must read native-subagent-plan.json and use spawn_agent/wait_agent/close_agent where available.");
  }
  if (allowedNext.length > 0) {
    result.push(`Allowed next stages: ${allowedNext.join(", ")}`);
  }
  if (stage === "implement") {
    result.push("After implementation agents complete, collect real native results before moving to verify. Do not end after an implementation agent returns.");
  }
  if (stage === "verify") {
    result.push("Verify stage requires tester execution and test-report.md before review.");
  }
  if (stage === "review") {
    result.push("Review stage requires reviewer execution and review-report.md before release.");
  }
  if (stage === "release") {
    result.push("Release stage requires release execution and release-summary.md before done.");
  }
  return result;
}

function readFileSyncUtf8(target) {
  return existsSync(target) ? readFileSync(target, "utf8") : "";
}
