import { mkdir, readFile, readdir, rm, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "crewup-flow-"));
const appDir = path.join(tmpRoot, "app");
const packDir = path.join(tmpRoot, "pack");

await mkdir(appDir, { recursive: true });
await mkdir(packDir, { recursive: true });

try {
  runNpm(["init", "-y"], appDir);
  const tarball = packPackage(packDir);
  runNpm(["install", tarball], appDir);

  runCli(appDir, ["install"]);
  runCli(appDir, ["inspect", "--no-ai"]);
  runCli(appDir, ["init", "--yes", "--agent", "codex"]);
  runCli(appDir, ["check"]);

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
    "intake",
    "implementation",
    "verification_tester",
    "verification_reviewer",
    "verification_release"
  ], "complex native plan groups");

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

function assertIncludes(output, expected, label) {
  if (!output.includes(expected)) {
    throw new Error(`Missing ${label}: expected "${expected}" in output:\n${output}`);
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
