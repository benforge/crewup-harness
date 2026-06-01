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
  doctor: "doctor.mjs",
  check: "check.mjs",
  run: "run.mjs",
  finalize: "finalize.mjs",
  finish: "finish.mjs",
  status: "status.mjs",
  next: "next.mjs",
  report: "report.mjs",
  "gate-check": "gate-check.mjs",
  verify: "verify.mjs",
  "context-pack": "context-pack.mjs",
  "agent-plan": "native-plan.mjs",
  "native-plan": "native-plan.mjs",
  "native-state": "native-state.mjs",
  "repair-artifacts": "repair-artifacts.mjs",
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
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

if (command !== "doctor" && !existsSync(path.join(cwd, ".harness"))) {
  console.error("No .harness/ directory found in the current project. Run: crewup install");
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
    console.error("A .harness/ directory already exists. Use: crewup install --force");
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

  console.log("CrewUp installed into the current project.");
  console.log("- .harness/");
  console.log(!hadAgents || force ? "- AGENTS.md" : "- AGENTS.md (already existed, not overwritten)");
  console.log(gitignoreUpdated ? "- .gitignore (added CrewUp runtime ignores)" : "- .gitignore (CrewUp ignores already present)");
  console.log("");
  console.log("Next:");
  console.log("  crewup doctor");
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
    throw new Error(`Refusing to operate outside the current directory: ${resolved}`);
  }
  await stat(resolved).catch(() => null);
}

function runScript(script, scriptArgs) {
  const scriptPath = path.join(packageRoot, ".harness", "scripts", script);
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      CREWUP_SCRIPT_ROOT: path.join(packageRoot, ".harness", "scripts")
    }
  });
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`CrewUp CLI

Usage:
  crewup install [--force]
  crewup doctor
  crewup inspect --no-ai
  crewup init [--force] [--agent <name>] [--yes]
  crewup check
  crewup run "implement this now..."
  crewup finish <run-id>
  crewup finalize <run-id>

Common commands:
  install          Copy .harness/ and AGENTS.md into the current project
  doctor           Check environment, capabilities, and preflight conditions
  inspect          Generate project snapshot and adaptation plan
  init             Generate .harness/project/ adaptation layer; prompts for agent by default
  check            Validate harness config and core scripts
  run              Create or prepare a work run
  agent-plan       Generate a Codex native plan or universal bridge handoff
  finish           Move a run to done and auto-commit by archive policy
  finalize         Compatibility alias for finish
  status           Show current run status
  next             Suggest the next step for a run
  report           Generate a run summary report
  gate-check       Run quality gates
  repair-artifacts Normalize required artifact headings and empty states
  archive-status   Check whether a run is ready for archive commit
  knowledge        Refresh the knowledge layer`);
}
