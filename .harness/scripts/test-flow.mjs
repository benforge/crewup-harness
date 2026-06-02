import { mkdir, readFile, readdir, rm, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { hasTemplatePlaceholder } from "./lib/placeholder-detector.mjs";

const root = process.cwd();
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "crewup-flow-"));
const appDir = path.join(tmpRoot, "app");
const packDir = path.join(tmpRoot, "pack");

await mkdir(appDir, { recursive: true });
await mkdir(packDir, { recursive: true });

try {
  assertPlaceholderDetector();

  runNpm(["init", "-y"], appDir);
  const tarball = packPackage(packDir);
  runNpm(["install", tarball], appDir);

  runCli(appDir, ["install"]);
  await seedExistingHarnessState(appDir);
  runCli(appDir, ["install", "--force"]);
  assertExistingHarnessStatePreserved(appDir);

  runCli(appDir, ["inspect", "--no-ai"]);
  runCli(appDir, ["init", "--yes", "--agent", "codex"]);
  runCli(appDir, ["check"]);

  const missingGate = runInstalledScript(appDir, ".harness/scripts/gate-check.mjs", ["missing-run"], { expectedStatus: 1 });
  assertNotIncludes(missingGate, "SyntaxError", "gate-check syntax error");

  const planOnlyOutput = runCli(appDir, [
    "run",
    "--dry-run",
    "\u4f7f\u7528 CrewUp \u5148\u89c4\u5212\u4e00\u4e2a\u5927\u578b\u7cfb\u7edf\u7684\u6a21\u5757\u8fb9\u754c\u548c\u6280\u672f\u8def\u7ebf\uff0c\u4e0d\u5199\u4ee3\u7801"
  ]);
  assertIncludes(planOnlyOutput, "workflow_profile: plan_only", "plan-only dry run profile");

  const strictLoopOutput = runCli(appDir, [
    "run",
    "--dry-run",
    "\u7528 crewup \u505a\u4e00\u4e2a\u6700\u5c0f\u53ef\u8fd0\u884c MVP\uff0c\u5fc5\u987b\u5b8c\u6574\u95ed\u73af\uff1a\u9700\u6c42\u786e\u8ba4\u3001\u67b6\u6784/\u5b9e\u73b0\u8ba1\u5212\u3001frontend \u5b9e\u73b0\u3001tester \u9a8c\u8bc1\u3001reviewer \u5ba1\u67e5\u3001release \u603b\u7ed3\u3002"
  ]);
  assertIncludes(strictLoopOutput, "workflow_profile: full", "explicit strict workflow stays full");

  const planOnlyRunOutput = runCli(appDir, [
    "run",
    "\u7528 CrewUp \u89c4\u5212\u4e00\u4e2a\u5168\u6808\u535a\u5ba2\u7cfb\u7edf\u3002\u5f53\u524d\u9636\u6bb5\u53ea\u505a\u9700\u6c42\u6f84\u6e05\u3001\u6280\u672f\u9009\u578b\u5efa\u8bae\u3001\u76ee\u5f55\u7ed3\u6784\u8bbe\u8ba1\u3001\u6a21\u5757\u8fb9\u754c\u3001\u5f00\u53d1\u9636\u6bb5\u62c6\u5206\u548c\u9a8c\u6536\u6807\u51c6\uff0c\u4e0d\u5199\u4e1a\u52a1\u4ee3\u7801\u3002\u7cfb\u7edf\u5305\u542b C \u7aef\u535a\u5ba2\u524d\u53f0\u3001Admin \u540e\u53f0\u3001\u540e\u7aef API\u3001\u6570\u636e\u5e93\u3002"
  ]);
  assertIncludes(planOnlyRunOutput, "profile: plan_only", "plan-only formal run profile");
  const planOnlyRunId = extractRunId(planOnlyRunOutput);
  if (!planOnlyRunId) throw new Error(`Failed to detect plan-only runId from output: ${planOnlyRunOutput}`);
  assertIncludes(planOnlyRunId, "plan-fullstack-blog-system", "semantic plan-only run id");

  const planOnlyRunDir = path.join(appDir, ".harness", "runs", planOnlyRunId);
  const planOnlyTaskNames = await listTaskNames(path.join(planOnlyRunDir, "tasks"));
  assertSameMembers(planOnlyTaskNames, ["architect", "requirements", "requirements-plan", "reviewer"], "plan-only task assignment");
  assertNotExists(path.join(planOnlyRunDir, "artifacts", "requirement-plan.md"), "main-authored requirement-plan artifact");

  const requirementPlanTask = await readFile(path.join(planOnlyRunDir, "tasks", "requirements-plan.task.md"), "utf8");
  assertIncludes(requirementPlanTask, "Original Request Summary", "requirements-plan English heading");
  assertIncludes(requirementPlanTask, "Impact Scope Candidates", "requirements-plan impact heading");
  assertIncludes(requirementPlanTask, "artifactUpdates", "task result contract requires artifactUpdates");
  assertIncludes(requirementPlanTask, "do not use `artifacts`", "task result contract rejects artifacts alias");

  const testerTaskCandidates = await createStrictFrontendRun(appDir);
  assertIncludes(testerTaskCandidates.frontendTask, "src/**", "frontend task includes src scope");
  assertIncludes(testerTaskCandidates.frontendTask, "package.json", "frontend task includes package scope");
  assertIncludes(testerTaskCandidates.testerTask, "non-blank page", "tester baseline includes non-blank check");
  assertIncludes(testerTaskCandidates.testerTask, "empty input rejection", "tester baseline includes empty input check");
  assertIncludes(testerTaskCandidates.reviewerTask, "- [x] pass", "reviewer pass format is explicit");

  const planOnlyPlan = JSON.parse(await readFile(path.join(planOnlyRunDir, "logs", "native-subagents", "native-subagent-plan.json"), "utf8"));
  const requirementsPlanNativeTask = planOnlyPlan.tasks.find((task) => task.agent === "requirements-plan");
  if (!requirementsPlanNativeTask) throw new Error("Missing requirements-plan native task");
  assertIncludes(requirementsPlanNativeTask.allowed_patterns.join("\n"), `.harness/runs/${planOnlyRunId}/logs/native-subagents/requirements-plan.result.md`, "requirements-plan result md allowed pattern");
  assertIncludes(requirementsPlanNativeTask.allowed_patterns.join("\n"), `.harness/runs/${planOnlyRunId}/logs/native-subagents/requirements-plan.result.json`, "requirements-plan result json allowed pattern");

  const requirementsPlanSpawn = await readFile(path.join(planOnlyRunDir, "logs", "native-subagents", "requirements-plan.spawn.md"), "utf8");
  assertIncludes(requirementsPlanSpawn, "Result files are subagent-owned audit outputs", "subagent-owned result prompt");
  assertIncludes(requirementsPlanSpawn, "main agent may only register", "main-agent result registration boundary");
  assertIncludes(requirementsPlanSpawn, "do not use `artifacts` as a substitute", "native prompt rejects artifacts alias");

  assertSameMembers(planOnlyPlan.groups.map((group) => group.id), [
    "requirements_planning",
    "requirements_confirmation",
    "architecture_planning",
    "verification_reviewer"
  ], "plan-only native plan groups");
  assertSameMembers(prereqsFor(planOnlyPlan, "requirements"), ["requirements-plan"], "requirements prerequisites");
  assertSameMembers(prereqsFor(planOnlyPlan, "architect"), ["requirements-plan", "requirements"], "architect prerequisites");
  assertAgentModel(planOnlyPlan, "requirements", { modelHint: "gpt-5.5", reasoningEffort: "medium" });
  assertAgentModel(planOnlyPlan, "architect", { modelHint: "gpt-5.5", reasoningEffort: "medium" });

  await writeFile(path.join(planOnlyRunDir, "logs", "native-subagents", "tester.result.json"), `${JSON.stringify({
    agent: "tester",
    status: "completed",
    requiredFixes: [
      {
        id: "RF-01",
        targetAgents: ["frontend", "devops"],
        severity: "high",
        acceptanceCriteria: ["AC-01"],
        summary: "Wire UI to the real API and align environment variables.",
        evidence: "tester evidence",
        requiredChange: "Update frontend API client and env docs."
      }
    ],
    targetAgents: ["frontend", "devops"],
    blockers: []
  }, null, 2)}\n`, "utf8");
  const repairPlanOutput = runCli(appDir, ["repair-plan", planOnlyRunId]);
  assertIncludes(repairPlanOutput, "Repair plan generated", "repair-plan output");
  assertExists(path.join(planOnlyRunDir, "logs", "repair-plan.md"), "repair-plan markdown");
  assertExists(path.join(planOnlyRunDir, "tasks", "repairs", "frontend.repair.task.md"), "frontend repair task");
  assertExists(path.join(planOnlyRunDir, "tasks", "repairs", "devops.repair.task.md"), "devops repair task");

  console.log(JSON.stringify({
    planOnlyRunId,
    planOnlyTaskNames,
    strictFrontendTasksChecked: true
  }, null, 2));
  console.log("test-flow passed");
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}

async function createStrictFrontendRun(appDir) {
  const output = runCli(appDir, [
    "run",
    "\u7528 crewup \u73b0\u5728\u505a\u4e00\u4e2a\u6700\u5c0f\u53ef\u8fd0\u884c MVP\uff1a\u5b9e\u73b0\u4e00\u4e2a\u672c\u5730\u5f85\u529e\u5217\u8868\u5e94\u7528\uff0c\u5fc5\u987b\u5305\u542b\u5f00\u53d1\u5b9e\u73b0\u3002\u5f53\u524d run \u5fc5\u987b\u5b8c\u6574\u8d70\u5f00\u53d1\u95ed\u73af\uff1a\u9700\u6c42\u786e\u8ba4\u3001\u67b6\u6784/\u5b9e\u73b0\u8ba1\u5212\u3001frontend \u5b9e\u73b0\u3001tester \u9a8c\u8bc1\u3001reviewer \u5ba1\u67e5\u3001release \u603b\u7ed3\u3002\u9a8c\u6536\uff1a\u53ef\u4ee5\u6dfb\u52a0\u5f85\u529e\u3001\u5237\u65b0\u540e\u4fdd\u7559\u3001\u53ef\u4ee5\u6807\u8bb0\u5b8c\u6210\u3001\u53ef\u4ee5\u5220\u9664\u3001build \u901a\u8fc7\u3002"
  ]);
  const runId = extractRunId(output);
  if (!runId) throw new Error(`Failed to detect strict frontend runId from output: ${output}`);
  const runDir = path.join(appDir, ".harness", "runs", runId);
  return {
    frontendTask: await readFile(path.join(runDir, "tasks", "frontend.task.md"), "utf8"),
    testerTask: await readFile(path.join(runDir, "tasks", "tester.task.md"), "utf8"),
    reviewerTask: await readFile(path.join(runDir, "tasks", "reviewer.task.md"), "utf8")
  };
}

function packPackage(packDir) {
  const result = runNpm(["pack", "--json", "--pack-destination", packDir], root);
  const payload = JSON.parse(result.stdout.trim() || "[]");
  const file = payload.at(-1)?.filename;
  if (!file) throw new Error(`npm pack did not return a filename: ${result.stdout || result.stderr || "empty output"}`);
  return path.join(packDir, file);
}

function runNpm(args, cwd) {
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/c", "npm", ...args], { cwd, encoding: "utf8" })
    : spawnSync("npm", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stdout || "") + (result.stderr || "") || `npm ${args.join(" ")} failed`);
  }
  return result;
}

function runCli(cwd, args) {
  const bin = path.join(cwd, "node_modules", "crewup-harness", "bin", "crewup.mjs");
  const result = spawnSync(process.execPath, [bin, ...args], { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stdout || "") + (result.stderr || ""));
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function runInstalledScript(cwd, scriptRelPath, args, { expectedStatus = 0 } = {}) {
  const script = path.join(cwd, "node_modules", "crewup-harness", scriptRelPath);
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  if (result.status !== expectedStatus) {
    throw new Error(`Expected ${scriptRelPath} status ${expectedStatus}, got ${result.status}\n${result.stdout || ""}${result.stderr || ""}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertPlaceholderDetector() {
  const legitimatePlanningText = [
    "## Open Questions\n- Confirm whether comments require a later moderation flow.",
    "## Implementation Phases\n- The homepage can display a placeholder hero area as a planned module boundary.",
    "## Configuration\n- Provide environment variable templates such as DATABASE_URL and AUTH_SECRET."
  ].join("\n\n");
  if (hasTemplatePlaceholder(legitimatePlanningText)) {
    throw new Error("placeholder detector flagged legitimate planning language");
  }

  for (const placeholder of ["TBD", "waiting for Architect Agent", "fill this acceptance criteria section", "- "]) {
    if (!hasTemplatePlaceholder(placeholder)) {
      throw new Error(`placeholder detector missed template placeholder: ${placeholder}`);
    }
  }
}

function extractRunId(output) {
  const match = /Harness run .*?[:\uFF1A]\s*(.+)/.exec(output);
  return match?.[1]?.trim() ?? "";
}

function assertExists(target, label) {
  if (!existsSync(target)) throw new Error(`Missing ${label}: ${target}`);
}

function assertNotExists(target, label) {
  if (existsSync(target)) throw new Error(`Unexpected ${label}: ${target}`);
}

async function seedExistingHarnessState(appDir) {
  const files = [
    [".harness/runs/keep-run/state.json", "{}\n"],
    [".harness/knowledge/custom-note.md", "keep knowledge\n"],
    [".harness/project/custom-state.md", "keep project state\n"],
    [".harness/reports/custom-report.md", "keep report\n"],
    [".harness/dashboard/index.html", "<html>keep dashboard</html>\n"],
    [".harness/backlog/ready/001-custom-item.md", "keep backlog\n"]
  ];
  for (const [relPath, content] of files) {
    const target = path.join(appDir, relPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
}

function assertExistingHarnessStatePreserved(appDir) {
  for (const relPath of [
    ".harness/runs/keep-run/state.json",
    ".harness/knowledge/custom-note.md",
    ".harness/project/custom-state.md",
    ".harness/reports/custom-report.md",
    ".harness/dashboard/index.html",
    ".harness/backlog/ready/001-custom-item.md"
  ]) {
    assertExists(path.join(appDir, relPath), `preserved ${relPath}`);
  }
}

function assertIncludes(output, expected, label) {
  if (!output.includes(expected)) {
    throw new Error(`Missing ${label}: expected "${expected}" in output:\n${output}`);
  }
}

function assertNotIncludes(output, unexpected, label) {
  if (output.includes(unexpected)) {
    throw new Error(`Unexpected ${label}: found "${unexpected}" in output:\n${output}`);
  }
}

function assertSameMembers(actual, expected, label) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error(`${label} mismatch.\nExpected: ${expectedSorted.join(", ")}\nActual: ${actualSorted.join(", ")}`);
  }
}

async function listTaskNames(dir) {
  if (!existsSync(dir)) return [];
  const names = [];
  const tasks = await readdir(dir, { withFileTypes: true });
  for (const entry of tasks) {
    if (entry.isFile() && entry.name.endsWith(".task.md")) names.push(entry.name.replace(/\.task\.md$/, ""));
  }
  return names.sort();
}

function prereqsFor(plan, agent) {
  return plan.tasks.find((task) => task.agent === agent)?.requires_completed_agents ?? [];
}

function assertAgentModel(plan, agent, expected) {
  const task = plan.tasks.find((item) => item.agent === agent);
  if (!task) throw new Error(`Missing task for ${agent}`);
  if (task.model_hint !== expected.modelHint || task.reasoning_effort !== expected.reasoningEffort) {
    throw new Error(`${agent} model mismatch. Expected ${expected.modelHint}/${expected.reasoningEffort}, got ${task.model_hint}/${task.reasoning_effort}`);
  }
}
