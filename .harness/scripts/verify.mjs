import { spawn } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { inferOverlayScopes, loadProjectOverlay, resolveImpactScopes } from "./lib/project-overlay.mjs";
import { readJsonFile } from "./lib/json.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const forceFull = args.includes("--full");

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:verify -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const testReportPath = path.join(runDir, "artifacts", "test-report.md");

if (!existsSync(runDir)) {
  console.error(`run 不存在：${runId}`);
  process.exit(1);
}

const checksConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "checks.yaml"), "utf8"));
const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const impactScopesConfig = resolveImpactScopes(projectProfile, projectOverlay.profile);
const packageJson = await readJsonFile(path.join(root, "package.json"));
const rootScripts = packageJson.scripts ?? {};
const runInput = await readFile(path.join(runDir, "input.md"), "utf8").catch(() => "");
const impactScopes = await resolveRunImpactScopes(runInput);
const workspaceTargets = forceFull ? [] : await resolveWorkspaceTargets(impactScopes);
const results = [];
const hasEhInstall = existsSync(path.join(root, "node_modules", ".bin", process.platform === "win32" ? "eh.cmd" : "eh"))
  || existsSync(path.join(root, "node_modules", ".bin", process.platform === "win32" ? "eff-harness.cmd" : "eff-harness"))
  || existsSync(path.join(root, "node_modules", ".bin", process.platform === "win32" ? "harness.cmd" : "harness"));

for (const check of checksConfig.checks ?? []) {
  const scriptName = scriptNameForCheck(check);
  if (scriptName && workspaceTargets.length > 0 && check.scope_aware !== false) {
    const scoped = await runWorkspaceCheck(check, scriptName, workspaceTargets);
    results.push(...scoped);
    continue;
  }

  if (check.when_script_exists && !rootScripts[check.when_script_exists]) {
    if (check.id === "harness-check" && hasEhInstall) {
      const command = "npx eh check";
      const result = await runCommand(command);
      results.push({
        ...check,
        command,
        status: result.exitCode === 0 ? "passed" : "failed",
        exitCode: result.exitCode,
        output: result.output,
        scopeMode: forceFull ? "full" : "global"
      });
      continue;
    }
    results.push({
      ...check,
      status: "skipped",
      exitCode: null,
      output: `跳过：package.json 中没有 ${check.when_script_exists} 脚本。`,
      scopeMode: forceFull ? "full" : "global"
    });
    continue;
  }

  const result = await runCommand(check.command);
  results.push({
    ...check,
    status: result.exitCode === 0 ? "passed" : "failed",
    exitCode: result.exitCode,
    output: result.output,
    scopeMode: forceFull ? "full" : "global"
  });
}

await writeFile(testReportPath, renderReport(runId, results), "utf8");

const failedRequired = results.filter((item) => item.required && item.status === "failed");
if (failedRequired.length > 0) {
  console.error("必需检查失败：");
  for (const item of failedRequired) {
    console.error(`- ${item.id}`);
  }
  process.exit(1);
}

console.log(`验证完成，报告已写入：${path.relative(root, testReportPath)}`);

async function runWorkspaceCheck(check, scriptName, targets) {
  const scopedResults = [];
  for (const target of targets) {
    if (!target.scripts[scriptName]) {
      scopedResults.push({
        ...check,
        id: `${check.id}:${target.scope}`,
        name: `${check.name} (${target.scope})`,
        command: `npm --workspace ${target.workspace} run ${scriptName}`,
        status: "skipped",
        exitCode: null,
        output: `跳过：${target.path}/package.json 中没有 ${scriptName} 脚本。`,
        scope: target.scope,
        scopeMode: "scoped"
      });
      continue;
    }

    const command = `npm --workspace ${target.workspace} run ${scriptName}`;
    const result = await runCommand(command);
    scopedResults.push({
      ...check,
      id: `${check.id}:${target.scope}`,
      name: `${check.name} (${target.scope})`,
      command,
      status: result.exitCode === 0 ? "passed" : "failed",
      exitCode: result.exitCode,
      output: result.output,
      scope: target.scope,
      scopeMode: "scoped"
    });
  }
  return scopedResults;
}

function runCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: root,
      shell: true,
      env: process.env
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });
    child.on("close", (exitCode) => {
      resolve({ exitCode, output: output.trim() });
    });
  });
}

async function resolveRunImpactScopes(input) {
  const fromTasks = await impactScopesFromTasks();
  if (fromTasks.length > 0) return fromTasks;

  const inferred = inferOverlayScopes(projectOverlay.profile, { taskText: input });
  const manual = Object.keys(impactScopesConfig).filter((scope) => checkedScope(input, scope) || input.toLowerCase().includes(scope.toLowerCase()));
  return [...new Set([...inferred, ...manual])];
}

async function impactScopesFromTasks() {
  const tasksDir = path.join(runDir, "tasks");
  if (!existsSync(tasksDir)) return [];
  const files = (await readdir(tasksDir)).filter((name) => name.endsWith(".task.md") || name === "main-agent-summary.md");
  const scopes = [];
  for (const file of files) {
    const content = await readFile(path.join(tasksDir, file), "utf8");
    scopes.push(...extractImpactScopes(content));
  }
  return [...new Set(scopes)];
}

async function resolveWorkspaceTargets(scopes) {
  const targets = [];
  const seen = new Set();
  for (const scope of scopes) {
    const config = impactScopesConfig[scope];
    for (const writePath of config?.write_paths ?? []) {
      const workspacePath = workspacePathFromPattern(writePath);
      if (!workspacePath || seen.has(workspacePath)) continue;
      const packagePath = path.join(root, workspacePath, "package.json");
      if (!existsSync(packagePath)) continue;
      const pkg = JSON.parse(await readFile(packagePath, "utf8"));
      seen.add(workspacePath);
      targets.push({
        scope,
        path: workspacePath,
        workspace: pkg.name ?? workspacePath,
        scripts: pkg.scripts ?? {}
      });
    }
  }
  return targets;
}

function workspacePathFromPattern(pattern) {
  const normalized = String(pattern ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith(".harness/") || normalized.startsWith("infra/") || normalized.startsWith(".github/")) return null;
  const beforeGlob = normalized.split("*")[0].replace(/\/+$/, "");
  const parts = beforeGlob.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}

function scriptNameForCheck(check) {
  const id = String(check.id ?? "");
  if (!["lint", "typecheck", "test", "build"].includes(id)) return null;
  if (check.when_script_exists) return check.when_script_exists;
  const match = /^npm\s+run\s+([^\s]+)/.exec(check.command ?? "");
  return match?.[1] ?? id;
}

function renderReport(currentRunId, checkResults) {
  const lines = [
    "# 测试报告",
    "",
    "## Run",
    "",
    `- runId: ${currentRunId}`,
    `- generatedAt: ${new Date().toISOString()}`,
    `- scope_mode: ${forceFull ? "full" : workspaceTargets.length > 0 ? "scoped" : "global"}`,
    `- impact_scopes: ${impactScopes.length ? impactScopes.join(", ") : "(none)"}`,
    `- workspace_targets: ${workspaceTargets.length ? workspaceTargets.map((item) => item.path).join(", ") : "(none)"}`,
    "",
    "## 结果汇总",
    "",
    "| 检查 | 范围 | 状态 | 必需 | 退出码 |",
    "| --- | --- | --- | --- | --- |"
  ];

  for (const result of checkResults) {
    lines.push(`| ${result.name} | ${result.scope ?? result.scopeMode ?? "global"} | ${result.status} | ${result.required ? "是" : "否"} | ${result.exitCode ?? "-"} |`);
  }

  lines.push("", "## 详细输出", "");

  for (const result of checkResults) {
    lines.push(`### ${result.name}`, "", `范围：${result.scope ?? result.scopeMode ?? "global"}`, `状态：${result.status}`, "");
    lines.push("```text");
    lines.push(result.output || "无输出");
    lines.push("```", "");
  }

  lines.push("## 执行项", "");
  for (const result of checkResults) {
    lines.push(`- ${result.name}: ${result.command}`);
  }
  lines.push("");

  lines.push("## 通过项", "");
  const passed = checkResults.filter((result) => result.status === "passed");
  lines.push(...(passed.length ? passed.map((result) => `- ${result.name}`) : ["- 无"]));
  lines.push("");

  lines.push("## 失败 / 阻塞项", "");
  const failed = checkResults.filter((result) => result.status === "failed");
  lines.push(...(failed.length ? failed.map((result) => `- ${result.name}，退出码 ${result.exitCode}`) : ["- 无"]));
  lines.push("");

  lines.push("## 未覆盖风险", "");
  const skipped = checkResults.filter((result) => result.status === "skipped");
  const risks = skipped.length ? skipped.map((result) => `- ${result.name} 未运行：${result.output}`) : [];
  if (!forceFull && impactScopes.length > 0 && workspaceTargets.length === 0) {
    risks.push("- 本次影响范围未命中 workspace package，已退回全局/通用检查；如这是业务代码改动，需要补充 scope 或本地 package.json。");
  }
  lines.push(...(risks.length ? risks : ["- 无"]));
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function extractImpactScopes(markdown) {
  const line = markdown.split(/\r?\n/).find((item) => item.trim().startsWith("- impact_scopes:"));
  if (!line) return [];
  return line
    .split(":")
    .slice(1)
    .join(":")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "(none)");
}

function checkedScope(content, scope) {
  return new RegExp(`- \\[[xX]\\]\\s+${escapeRegExp(scope)}\\b`, "i").test(content);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


