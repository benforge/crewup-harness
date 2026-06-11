#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeCoreLock } from "../.harness/scripts/lib/core-lock.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwd = process.cwd();
const [command, ...args] = process.argv.slice(2);

const scriptByCommand = {
  inspect: "inspect.mjs",
  init: "init.mjs",
  doctor: "doctor.mjs",
  check: "check.mjs",
  run: "run.mjs",
  finish: "finish.mjs",
  archive: "archive.mjs",
  cancel: "cancel.mjs",
  continue: "continue-run.mjs",
  status: "status.mjs",
  runs: "status.mjs",
  explain: "flow-health.mjs",
  health: "flow-health.mjs",
  drive: "drive.mjs",
  "prepare-run": "prepare-run.mjs",
  report: "report.mjs",
  "gate-check": "gate-check.mjs",
  audit: "orchestration-audit.mjs",
  "context-pack": "context-pack.mjs",
  "agent-plan": "native-plan.mjs",
  "next-agent": "next-agent.mjs",
  clarify: "clarify.mjs",
  "native-plan": "native-plan.mjs",
  "native-state": "native-state.mjs",
  "repair-plan": "repair-plan.mjs",
  "repair-state": "repair-state.mjs",
  "tool-fallback": "tool-fallback.mjs",
  "spec-freeze": "spec-freeze.mjs",
  transition: "transition.mjs",
  learn: "learn.mjs",
  "learn-promote": "learn-promote.mjs",
  knowledge: "knowledge.mjs",
  "knowledge-select": "knowledge-select.mjs",
  dashboard: "dashboard.mjs",
  "archive-commit": "archive-commit.mjs",
  "changed-files": "changed-files.mjs",
  "token-ledger": "token-ledger.mjs",
  "dev-service": "dev-service.mjs",
  "preview-smoke": "preview-smoke.mjs",
  "test-flow": "test-flow.mjs",
  "product-sync": "product-sync.mjs",
};

if (!command || ["help", "--help", "-h"].includes(command)) {
  printHelp();
  process.exit(0);
}

if (command === "install") {
  await installHarness({ force: args.includes("--force"), reset: args.includes("--reset") });
  process.exit(0);
}

const script = scriptByCommand[command];
if (!script) {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

if (command === "init" && !existsSync(path.join(cwd, ".harness"))) {
  console.log("No .harness/ directory found. Installing CrewUp template first...");
  await installHarness({ force: false });
}

if (command !== "doctor" && !existsSync(path.join(cwd, ".harness"))) {
  console.error("No .harness/ directory found in the current project. Run: crewup install");
  process.exit(1);
}

runScript(script, args);

async function installHarness({ force, reset }) {
  const sourceHarness = path.join(packageRoot, ".harness");
  const targetHarness = path.join(cwd, ".harness");
  const sourceAgents = path.join(packageRoot, "AGENTS.md");
  const targetAgents = path.join(cwd, "AGENTS.md");
  const hadAgents = existsSync(targetAgents);
  const hadHarness = existsSync(targetHarness);

  if (hadHarness && !force && !reset) {
    console.error("A .harness/ directory already exists. Use: crewup install --force");
    process.exit(1);
  }

  if (reset && hadHarness) {
    await assertInsideCwd(targetHarness);
    await rm(targetHarness, { recursive: true, force: true });
  }

  await mkdir(targetHarness, { recursive: true });
  await copyHarness(sourceHarness, targetHarness, { preserveExistingState: force && hadHarness && !reset });

  if (!hadAgents || force || reset) {
    if ((force || reset) && hadAgents) await assertInsideCwd(targetAgents);
    await cp(sourceAgents, targetAgents, { force: true });
  }

  const gitignoreUpdated = await ensureGitignore();
  await writeCoreLock(cwd, { source: reset ? "crewup install --reset" : force ? "crewup install --force" : "crewup install" });

  console.log("CrewUp installed into the current project.");
  console.log("- .harness/");
  console.log("- .harness/core-lock.json");
  if (force && hadHarness && !reset) console.log("- preserved .harness runtime/project state");
  if (reset) console.log("- reset existing .harness/ before install");
  console.log(!hadAgents || force || reset ? "- AGENTS.md" : "- AGENTS.md (already existed, not overwritten)");
  console.log(gitignoreUpdated ? "- .gitignore (added CrewUp runtime ignores)" : "- .gitignore (CrewUp ignores already present)");
  console.log("");
  console.log("Next:");
  console.log("  crewup doctor");
  console.log("  crewup init --agent codex --yes");
  console.log("  crewup check");
  console.log("");
  console.log("Optional:");
  console.log("  crewup inspect --no-ai");
}

async function copyHarness(source, target, options = {}) {
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    const rel = path.relative(path.join(packageRoot, ".harness"), sourcePath).replaceAll("\\", "/");

    if (shouldSkipInstallPath(rel)) continue;
    if (options.preserveExistingState && shouldPreserveExistingStatePath(rel) && existsSync(targetPath)) continue;

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyHarness(sourcePath, targetPath, options);
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
  if (normalized === "core-lock.json") return true;
  if (normalized === "reports/project-inspection.md") return true;
  if (normalized === "reports/intake-decision.md") return true;
  if (normalized === "reports/last-harness-run.md") return true;
  if (normalized === "reports/knowledge-refresh.md") return true;
  if (normalized === "dashboard/index.html") return true;
  if (normalized.startsWith("runs/") && normalized !== "runs/.gitkeep") return true;
  if (normalized.startsWith("reports/") && normalized !== "reports/.gitkeep") return true;
  if (normalized.startsWith("dashboard/") && normalized !== "dashboard/.gitkeep") return true;
  if (normalized.startsWith("knowledge/") && ![
    "knowledge/.gitkeep",
    "knowledge/README.md",
    "knowledge/lessons-learned.md",
    "knowledge/lessons",
    "knowledge/lessons/active",
    "knowledge/lessons/archived",
    "knowledge/lessons/candidates",
    "knowledge/lessons/active/.gitkeep",
    "knowledge/lessons/archived/.gitkeep",
    "knowledge/lessons/candidates/.gitkeep"
  ].includes(normalized)) return true;
  return false;
}

function shouldPreserveExistingStatePath(rel) {
  const normalized = rel.replaceAll("\\", "/");
  if (!normalized) return false;
  return [
    "runs/",
    "reports/",
    "dashboard/",
    "knowledge/",
    "project/"
  ].some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
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
!.harness/knowledge/lessons/
.harness/knowledge/lessons/*
!.harness/knowledge/lessons/active/
!.harness/knowledge/lessons/archived/
!.harness/knowledge/lessons/candidates/
!.harness/knowledge/lessons/active/.gitkeep
!.harness/knowledge/lessons/archived/.gitkeep
!.harness/knowledge/lessons/candidates/.gitkeep
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
  const runtimeDirs = new Set(["runs", "reports", "dashboard", "knowledge"]);
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
  crewup install [--force] [--reset]
  crewup doctor
  crewup doctor --encoding-help
  crewup doctor --encoding-profile
  crewup init [--force] [--agent <codex|claude|cursor|trae|manual>] [--yes]
  crewup inspect --no-ai                 # optional for existing/complex repositories
  crewup check
  crewup run --mode=lite "low-risk narrow task"
  crewup run --mode=strict "formal delivery task"
  crewup run --mode=strict --risk=high "high-risk task"
  crewup run --mode=plan "planning only, no code"
  crewup run --mode=discovery "project discovery"
  crewup status [run-id]
  crewup runs
  crewup explain <run-id>
  crewup drive <run-id> --until=done
  crewup next-agent <run-id>
  crewup clarify <run-id>
  crewup native-state <run-id> diagnose
  crewup native-state <run-id> reconcile-results
  crewup tool-fallback <run-id> --tool <name> --reason <reason> --fallback <method>
  crewup audit <run-id>
  crewup gate-check <run-id>
  crewup repair-state <run-id> --reopen-blocked --apply
  crewup repair-state <run-id> --prune-unassigned-implementation [--apply]
  crewup preview-smoke <run-id> --url=http://localhost:3000
  crewup report <run-id>
  crewup learn <run-id>
  crewup learn-promote <lesson-id>
  crewup archive <run-id> --outcome=<success|partial|blocked|canceled|failed> [--close]
  crewup cancel <run-id> --reason <reason>
  crewup continue <run-id> "continue from the previous run"
  crewup finish <run-id>

Daily path:
  Most users only need doctor/init/check, run, status/runs, explain,
  finish, archive, cancel, and continue.

Mode selection:
  crewup run --mode=lite "..."          Explicit lightweight workflow
  crewup run --mode=strict "..."        Formal multi-agent delivery
  crewup run --mode=strict --risk=high  Strict delivery with stronger risk gates
  crewup run --mode=plan "..."          Planning only; no business-code changes
  crewup run --mode=discovery "..."     Project/module discovery; no business-code changes
  No explicit CrewUp request            Normal chat; no run is created

Core workflow:
  install          Copy or update .harness/ and AGENTS.md; --force preserves runtime state, --reset clears .harness first
  doctor           Check environment, capabilities, encoding, and preflight conditions
  doctor --encoding-help
                   Explain UTF-8 terminal troubleshooting for Windows/macOS/Linux
  doctor --encoding-profile
                   Print shell profile snippets for UTF-8 terminal setup
  inspect          Optional: generate project snapshot and adaptation plan for existing or complex repositories
  init             Generate .harness/project/ adaptation layer; prompts for Codex/Claude/Cursor/Trae/Manual by default
  check            Validate harness config and core scripts
  run              Create and prepare a run; explicit --mode is required for new runs
  run --profile=...
                   Compatibility alias for older profile-based callers; prefer --mode
  status           Show one run status card, or list runs when no run id is provided
  runs             Alias for status list
  explain          Explain where a run is, why it is stuck/open/done, and the next safe action
  drive            Deterministically reconcile, route, repair, gate, report, and finish when possible
  next-agent       Show currently runnable subagents; implementation agents are gated by architecture plan assignments
  clarify          Render requirements-plan clarification questions for user confirmation
  native-state     Register, reconcile, and diagnose native subagent handles and results
  audit            Audit dispatch order, owner boundaries, repair loops, and context pressure
  gate-check       Run quality gates and ownership checks
  report           Generate a run summary report
  learn            Extract candidate memory lessons from a run without changing routing or gates
  learn-promote    Promote a candidate lesson into active memory hints, or archive one with --archive
  archive          Mark outcomes; non-success stays open unless --close is explicit
  cancel           Mark a run canceled and archive that outcome without discarding files
  continue         Create a new run using a previous run as historical context
  finish           Move a run to done and auto-commit by archive policy

Subagent planning:
  agent-plan       Generate a Codex native plan or universal bridge handoff
  native-plan      Alias for agent-plan
  context-pack     Generate compact context packs for selected agents
  repair-plan      Convert tester/reviewer findings into owner repair tasks

Runtime support:
  dashboard        Generate or refresh .harness/dashboard/index.html
  dev-service      Start, stop, or inspect a run-scoped preview/dev service
  preview-smoke    Check preview URLs and write artifacts/preview-smoke.md evidence
  changed-files    Record or infer files changed by a run

Optional and advanced:
  knowledge        Refresh the knowledge layer

Compatibility / maintenance:
  repair-state     Repair malformed run state or prune unassigned implementation candidates when instructed by diagnostics
  tool-fallback    Record optional tool/plugin/MCP fallback evidence for a run
  product-sync     Sync approved release artifacts into product docs
  spec-freeze      Internal run-preparation artifact generated by crewup run

Governance:
  See docs/command-governance.md for command tiers, completion definitions,
  and what happens after success, partial, blocked, canceled, or failed outcomes.`);
}
