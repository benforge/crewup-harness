#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwd = process.cwd();
const [command, ...args] = process.argv.slice(2);

const scriptByCommand = {
  inspect: "inspect.mjs",
  init: "init.mjs",
  check: "check.mjs",
  run: "run.mjs",
  finalize: "finalize.mjs",
  status: "status.mjs",
  next: "next.mjs",
  report: "report.mjs",
  "gate-check": "gate-check.mjs",
  verify: "verify.mjs",
  "context-pack": "context-pack.mjs",
  "native-plan": "native-plan.mjs",
  "native-state": "native-state.mjs",
  transition: "transition.mjs",
  knowledge: "knowledge.mjs",
  dashboard: "dashboard.mjs",
  "archive-commit": "archive-commit.mjs",
  "archive-status": "archive-status.mjs",
  "changed-files": "changed-files.mjs",
  cleanup: "cleanup.mjs"
};

if (!command || ["help", "--help", "-h"].includes(command)) {
  printHelp();
  process.exit(0);
}

if (command === "install") {
  await installHarness({ force: args.includes("--force") });
  process.exit(0);
}

const script = scriptByCommand[command];
if (!script) {
  console.error(`未知命令：${command}`);
  printHelp();
  process.exit(1);
}

if (!existsSync(path.join(cwd, ".harness"))) {
  console.error("当前目录没有 .harness/。请先运行：crewup install");
  process.exit(1);
}

runScript(script, args);

async function installHarness({ force }) {
  const sourceHarness = path.join(packageRoot, ".harness");
  const targetHarness = path.join(cwd, ".harness");
  const sourceAgents = path.join(packageRoot, "AGENTS.md");
  const targetAgents = path.join(cwd, "AGENTS.md");
  const hadAgents = existsSync(targetAgents);

  if (existsSync(targetHarness) && !force) {
    console.error("当前目录已存在 .harness/。如需覆盖，请运行：crewup install --force");
    process.exit(1);
  }

  if (force && existsSync(targetHarness)) {
    await assertInsideCwd(targetHarness);
    await rm(targetHarness, { recursive: true, force: true });
  }

  await mkdir(targetHarness, { recursive: true });
  await copyHarness(sourceHarness, targetHarness);

  if (!hadAgents || force) {
    if (force && hadAgents) await assertInsideCwd(targetAgents);
    await cp(sourceAgents, targetAgents, { force: true });
  }
  const gitignoreUpdated = await ensureGitignore();

  console.log("CrewUp 已安装到当前项目：");
  console.log("- .harness/");
  console.log(!hadAgents || force ? "- AGENTS.md" : "- AGENTS.md（已存在，未覆盖）");
  console.log(gitignoreUpdated ? "- .gitignore（已追加 Harness 运行期忽略规则）" : "- .gitignore（Harness 忽略规则已存在）");
  console.log("");
  console.log("下一步：");
  console.log("  crewup inspect --no-ai");
  console.log("  crewup init --force");
  console.log("  crewup check");
}

async function copyHarness(source, target) {
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    const rel = path.relative(path.join(packageRoot, ".harness"), sourcePath).replaceAll("\\", "/");

    if (shouldSkipInstallPath(rel)) continue;

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyHarness(sourcePath, targetPath);
      await ensureGitkeepForRuntimeDir(rel, targetPath);
      continue;
    }

    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { force: true });
  }
}

function shouldSkipInstallPath(rel) {
  const normalized = rel.replaceAll("\\", "/");
  if (!normalized) return false;
  if (normalized === "project/inspect.json" || normalized === "project/adapter-plan.json") return true;
  if (normalized === "reports/project-inspection.md") return true;
  if (normalized === "reports/intake-decision.md") return true;
  if (normalized === "reports/last-harness-run.md") return true;
  if (normalized === "reports/knowledge-refresh.md") return true;
  if (normalized === "dashboard/index.html") return true;
  if (normalized.startsWith("runs/") && normalized !== "runs/.gitkeep") return true;
  if (normalized.startsWith("backlog/") && normalized.endsWith(".md")) return true;
  if (normalized.startsWith("reports/") && normalized !== "reports/.gitkeep") return true;
  if (normalized.startsWith("dashboard/") && normalized !== "dashboard/.gitkeep") return true;
  if (normalized.startsWith("knowledge/") && !["knowledge/.gitkeep", "knowledge/README.md", "knowledge/lessons-learned.md"].includes(normalized)) return true;
  return false;
}

async function ensureGitignore() {
  const target = path.join(cwd, ".gitignore");
  const marker = "# CrewUp runtime artifacts";
const block = `${marker}
node_modules/
.env
.env.*
.DS_Store
.harness/runs/*
!.harness/runs/.gitkeep
.harness/reports/*
!.harness/reports/.gitkeep
.harness/dashboard/*
!.harness/dashboard/.gitkeep
.harness/knowledge/*
!.harness/knowledge/.gitkeep
!.harness/knowledge/README.md
!.harness/knowledge/lessons-learned.md
.harness/project/inspect.json
.harness/project/adapter-plan.json
.harness/reports/skills*.md
.harness/reports/skills*.json
`;

  const current = existsSync(target) ? await readFile(target, "utf8") : "";
  if (current.includes(marker)) return false;
  const next = current.trimEnd() ? `${current.trimEnd()}\n\n${block}` : block;
  await writeFile(target, `${next.trimEnd()}\n`, "utf8");
  return true;
}

async function ensureGitkeepForRuntimeDir(rel, targetPath) {
  const normalized = rel.replaceAll("\\", "/");
  const runtimeDirs = new Set(["runs", "reports", "dashboard", "knowledge", "backlog/new", "backlog/ready", "backlog/in-progress", "backlog/review", "backlog/done"]);
  if (!runtimeDirs.has(normalized)) return;
  const marker = path.join(targetPath, ".gitkeep");
  if (!existsSync(marker)) await writeFile(marker, "", "utf8");
}

async function assertInsideCwd(target) {
  const root = path.resolve(cwd);
  const resolved = path.resolve(target);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`拒绝操作当前目录之外的路径：${resolved}`);
  }
  await stat(resolved).catch(() => null);
}

function runScript(script, scriptArgs) {
  const scriptPath = path.join(packageRoot, ".harness", "scripts", script);
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd,
    stdio: "inherit",
    env: process.env
  });
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`CrewUp CLI

用法：
  crewup install [--force]
  crewup inspect --no-ai
  crewup init --force
  crewup check
  crewup run "现在直接实现：..."
  crewup finalize <run-id>

常用命令：
  install          把 .harness/ 和 AGENTS.md 安装到当前项目
  inspect          生成项目画像和适配计划
  init             生成 .harness/project/ 适配层
  check            检查 harness 配置和核心脚本
  run              创建或准备一个正式 run
  finalize         推进到 done，并按归档策略自动执行 git 提交
  status           查看当前 runs 状态
  next             查看某个 run 的下一步建议
  report           生成某个 run 的汇总报告
  gate-check       运行质量门禁
  archive-status   解释某个 run 当前是否可以归档提交
  knowledge        刷新知识层索引`);
}

