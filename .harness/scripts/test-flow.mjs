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
  assertNotIncludes(missingGate, "hasTemplatePlaceholder", "gate-check duplicate placeholder declaration");

  const planOnlyOutput = runCli(appDir, [
    "run",
    "--dry-run",
    "使用 CrewUp 先规划一个大型系统的模块边界和技术路线，不写代码"
  ]);
  assertIncludes(planOnlyOutput, "workflow_profile: plan_only", "plan-only dry run profile");
  assertIncludes(planOnlyOutput, "run_type: plan_only", "plan-only dry run type");

  const implementationOutput = runCli(appDir, [
    "run",
    "--dry-run",
    "使用 CrewUp 现在实现一个后端 API 功能"
  ]);
  assertIncludes(implementationOutput, "workflow_profile: lite", "implementation dry run profile");
  assertIncludes(implementationOutput, "run_type: implementation", "implementation dry run type");

  const planOnlyRunOutput = runCli(appDir, [
    "run",
    "使用 CrewUp 规划一个全栈博客系统。当前阶段只做需求澄清、技术选型建议、目录结构设计、模块边界、开发阶段拆分和验收标准，不写业务代码。系统包含 C 端博客前台、Admin 后台、后端 API、数据库。"
  ]);
  assertIncludes(planOnlyRunOutput, "profile: plan_only", "plan-only formal run profile");
  const planOnlyRunId = extractRunId(planOnlyRunOutput);
  if (!planOnlyRunId) throw new Error(`Failed to detect plan-only runId from output: ${planOnlyRunOutput}`);
  assertIncludes(planOnlyRunId, "plan-fullstack-blog-system", "semantic plan-only run id");
  const planOnlyRunDir = path.join(appDir, ".harness", "runs", planOnlyRunId);
  const planOnlyTaskNames = await listTaskNames(path.join(planOnlyRunDir, "tasks"));
  assertSameMembers(planOnlyTaskNames, [
    "architect",
    "requirements",
    "requirements-plan",
    "reviewer"
  ], "plan-only task assignment");
  assertNotExists(path.join(planOnlyRunDir, "artifacts", "requirement-plan.md"), "main-authored requirement-plan artifact");
  const requirementPlanTask = await readFile(path.join(planOnlyRunDir, "tasks", "requirements-plan.task.md"), "utf8");
  assertIncludes(requirementPlanTask, "## Artifact Schema", "requirements-plan artifact schema section");
  assertIncludes(requirementPlanTask, "原始需求摘要", "requirements-plan required heading in task");
  assertIncludes(requirementPlanTask, "影响范围候选", "requirements-plan impact heading in task");
  const planOnlyPlan = JSON.parse(await readFile(path.join(planOnlyRunDir, "logs", "native-subagents", "native-subagent-plan.json"), "utf8"));
  const requirementsPlanNativeTask = planOnlyPlan.tasks.find((task) => task.agent === "requirements-plan");
  if (!requirementsPlanNativeTask) throw new Error("Missing requirements-plan native task");
  assertIncludes(
    requirementsPlanNativeTask.allowed_patterns.join("\n"),
    `.harness/runs/${planOnlyRunId}/logs/native-subagents/requirements-plan.result.md`,
    "requirements-plan result md allowed pattern"
  );
  assertIncludes(
    requirementsPlanNativeTask.allowed_patterns.join("\n"),
    `.harness/runs/${planOnlyRunId}/logs/native-subagents/requirements-plan.result.json`,
    "requirements-plan result json allowed pattern"
  );
  const requirementsPlanSpawn = await readFile(path.join(planOnlyRunDir, "logs", "native-subagents", "requirements-plan.spawn.md"), "utf8");
  assertIncludes(requirementsPlanSpawn, "Result files are subagent-owned audit outputs", "subagent-owned result prompt");
  assertIncludes(requirementsPlanSpawn, "main agent may only register", "main-agent result registration boundary");
  const requirementsPlanResultMd = path.join(planOnlyRunDir, "logs", "native-subagents", "requirements-plan.result.md");
  const requirementsPlanResultJson = path.join(planOnlyRunDir, "logs", "native-subagents", "requirements-plan.result.json");
  await writeFile(requirementsPlanResultMd, "Agent: requirements-plan\nStatus: completed\nSummary: result written by subagent\n", "utf8");
  await writeFile(requirementsPlanResultJson, `${JSON.stringify({
    agent: "requirements-plan",
    status: "completed",
    summary: "result written by subagent",
    filesChanged: [],
    artifactUpdates: [{ path: "artifacts/requirement-plan.md" }],
    artifactsUpdated: ["artifacts/requirement-plan.md"],
    tests: [],
    blockers: []
  }, null, 2)}\n`, "utf8");
  runCli(appDir, ["native-state", planOnlyRunId, "mark-spawned", "requirements-plan", "test-handle-requirements-plan"]);
  runCli(appDir, ["native-state", planOnlyRunId, "mark-result", "requirements-plan", "completed"]);
  const duplicateMarkResult = runCli(appDir, ["native-state", planOnlyRunId, "mark-result", "requirements-plan", "completed"]);
  assertIncludes(duplicateMarkResult, "Result already captured for requirements-plan", "idempotent native mark-result");
  assertSameMembers(planOnlyPlan.groups.map((group) => group.id), [
    "requirements_planning",
    "requirements_confirmation",
    "architecture_planning",
    "verification_reviewer"
  ], "plan-only native plan groups");
  assertSameMembers(
    prereqsFor(planOnlyPlan, "requirements"),
    ["requirements-plan"],
    "plan-only requirements prerequisites"
  );
  assertAgentModel(planOnlyPlan, "requirements", {
    modelHint: "gpt-5.5",
    reasoningEffort: "medium"
  });
  assertSameMembers(
    prereqsFor(planOnlyPlan, "architect"),
    ["requirements-plan", "requirements"],
    "plan-only architect prerequisites"
  );
  assertAgentModel(planOnlyPlan, "architect", {
    modelHint: "gpt-5.5",
    reasoningEffort: "medium"
  });
  const planOnlyStatePath = path.join(planOnlyRunDir, "state.json");
  const planOnlyState = JSON.parse(await readFile(planOnlyStatePath, "utf8"));
  planOnlyState.stage = "plan";
  planOnlyState.status = "in-progress";
  await writeFile(planOnlyStatePath, `${JSON.stringify(planOnlyState, null, 2)}\n`, "utf8");
  const planOnlyNext = runCli(appDir, ["next", planOnlyRunId]);
  assertIncludes(planOnlyNext, "planning-only run", "plan-only next stop note");
  assertNotIncludes(planOnlyNext, "--to=implement", "plan-only next implementation transition");

  const complexOutput = runCli(appDir, [
    "run",
    "使用 CrewUp 做一个大型项目：设计并实现用户认证、后端 API、数据库表、前端登录页、测试和发布说明。需要 requirements、architecture、backend、frontend、database、tester、reviewer、release 都参与，按严格流程分配子 agent。"
  ]);
  assertIncludes(complexOutput, "profile: full", "complex run profile");
  assertIncludes(complexOutput, "agents:", "complex run agent summary");
  const complexRunId = extractRunId(complexOutput);
  if (!complexRunId) throw new Error(`Failed to detect complex runId from output: ${complexOutput}`);
  const complexRunDir = path.join(appDir, ".harness", "runs", complexRunId);
  const complexTaskNames = await listTaskNames(path.join(complexRunDir, "tasks"));
  assertSameMembers(complexTaskNames, [
    "architect",
    "backend",
    "database",
    "docs",
    "frontend",
    "pm",
    "release",
    "requirements",
    "requirements-plan",
    "reviewer",
    "tester"
  ], "complex task assignment");
  const complexPlan = JSON.parse(await readFile(path.join(complexRunDir, "logs", "native-subagents", "native-subagent-plan.json"), "utf8"));
  assertSameMembers(complexPlan.tasks.map((task) => task.agent), complexTaskNames, "complex native plan agents");
  assertSameMembers(complexPlan.groups.map((group) => group.id), [
    "requirements_planning",
    "requirements_confirmation",
    "architecture_planning",
    "implementation",
    "verification_tester",
    "verification_reviewer",
    "verification_release"
  ], "complex native plan groups");
  assertSameMembers(
    prereqsFor(complexPlan, "requirements"),
    ["pm", "requirements-plan"],
    "requirements prerequisites"
  );
  assertSameMembers(
    prereqsFor(complexPlan, "architect"),
    ["pm", "requirements-plan", "requirements"],
    "architect prerequisites"
  );

  const runOutput = runCli(appDir, [
    "run",
    "现在做：优化 README 使用说明，增加一段如何启动项目的说明。验收：README 包含使用说明；不要修改源码。"
  ]);
  const runId = extractRunId(runOutput);
  if (!runId) throw new Error(`Failed to detect runId from output: ${runOutput}`);

  const runDir = path.join(appDir, ".harness", "runs", runId);
  assertExists(path.join(runDir, "artifacts", "spec-freeze.md"), "spec-freeze");
  assertExists(path.join(runDir, "logs", "context", "context-budget.json"), "context budget");
  assertExists(path.join(runDir, "logs", "token-ledger.json"), "token ledger");
  assertExists(path.join(runDir, "logs", "native-subagents", "native-subagent-plan.json"), "native plan");
  assertExists(path.join(runDir, "logs", "context", "docs.md"), "docs context");
  assertNotExists(path.join(runDir, "tasks", "tester.task.md"), "tester task for docs-only run");

  const statusOutput = runCli(appDir, ["status"]);
  if (!statusOutput.includes("context") || !statusOutput.includes("tokens")) {
    throw new Error(`status output does not include context/token summary: ${statusOutput}`);
  }

  runCli(appDir, ["report", runId]);
  const reportPath = path.join(runDir, "logs", "run-report.md");
  assertExists(reportPath, "run report");
  const report = await readFile(reportPath, "utf8");
  if (!report.includes("## Context Budget") || !report.includes("## Token Ledger")) {
    throw new Error("run report does not include context budget and token ledger sections");
  }

  const taskNames = await listTaskNames(path.join(runDir, "tasks"));
  const budget = JSON.parse(await readFile(path.join(runDir, "logs", "context", "context-budget.json"), "utf8"));
  const summary = {
    runId,
    tasks: taskNames,
    budgetAgents: (budget.agents ?? []).map((item) => item.agent),
    hasSpecFreeze: true,
    hasContextBudget: true,
    hasTokenLedger: true,
    hasNativePlan: true,
    dryRunProfiles: {
      planOnly: "plan_only",
      implementation: "lite"
    },
    planOnlyAssignment: {
      runId: planOnlyRunId,
      tasks: planOnlyTaskNames,
      groups: planOnlyPlan.groups.map((group) => group.id)
    },
    complexAssignment: {
      runId: complexRunId,
      tasks: complexTaskNames,
      groups: complexPlan.groups.map((group) => group.id)
    }
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("test-flow passed");
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
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
    "## 待确认问题\n- 评论是否需要审核流由后续产品确认。",
    "## 实施阶段\n- 首页可显示占位首页，用于规划首屏模块边界。",
    "## 配置\n- 提供环境变量模板，说明 DATABASE_URL 与 AUTH_SECRET。"
  ].join("\n\n");
  if (hasTemplatePlaceholder(legitimatePlanningText)) {
    throw new Error("placeholder detector flagged legitimate planning language");
  }

  for (const placeholder of [
    "TBD",
    "待 Architect Agent 补充",
    "这里填写验收标准",
    "- "
  ]) {
    if (!hasTemplatePlaceholder(placeholder)) {
      throw new Error(`placeholder detector missed template placeholder: ${placeholder}`);
    }
  }
}

function extractRunId(output) {
  const match = /Harness run 已准备好：(.+)/.exec(output) || /Harness run .+?[:：](.+)/.exec(output);
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
    throw new Error(
      `${agent} model mismatch. Expected ${expected.modelHint}/${expected.reasoningEffort}, got ${task.model_hint}/${task.reasoning_effort}`
    );
  }
}
