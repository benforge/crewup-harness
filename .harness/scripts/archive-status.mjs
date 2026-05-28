import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { readJsonFile } from "./lib/json.mjs";

const root = process.cwd();
const runId = process.argv[2];

if (!runId) {
  console.error("Usage: npm run harness:archive-status -- <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const statePath = path.join(runDir, "state.json");
const changedFilesPath = path.join(runDir, "logs", "changed-files.json");
const archivePolicyPath = path.join(root, ".harness", "config", "archive-policy.yaml");

const status = {
  runId,
  exists: existsSync(runDir),
  stateStage: null,
  done: false,
  gateOk: false,
  changedFiles: [],
  gitStatus: [],
  canArchive: false,
  blockers: []
};

if (!status.exists) {
  status.blockers.push(`Run not found: ${runId}`);
  printStatus(status);
  process.exit(1);
}

const state = existsSync(statePath) ? await readJsonFile(statePath) : {};
status.stateStage = state.stage ?? "unknown";
status.done = status.stateStage === "done";
status.changedFiles = await readChangedFiles();
status.gitStatus = gitStatus();
status.gateOk = await gateCheckLikelyPasses();

if (!status.done) status.blockers.push(`run stage is ${status.stateStage}, not done`);
if (!status.gateOk) status.blockers.push("quality gate has not been confirmed");
if (status.changedFiles.length === 0) status.blockers.push("changed-files manifest is empty");
if (!status.gitStatus.length) status.blockers.push("git worktree has no pending changes to archive");

const policy = parseYaml(await readFile(archivePolicyPath, "utf8")).archive;
const gitPolicy = policy.git ?? {};
if (!gitPolicy.enabled || !gitPolicy.auto_commit_after_done) {
  status.blockers.push("archive git auto-commit is disabled by policy");
}

status.canArchive = status.blockers.length === 0;
printStatus(status);
process.exit(status.canArchive ? 0 : 1);

async function readChangedFiles() {
  if (!existsSync(changedFilesPath)) return [];
  try {
    const parsed = await readJsonFile(changedFilesPath);
    return Array.isArray(parsed.files) ? parsed.files : [];
  } catch {
    return [];
  }
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return [];
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

async function gateCheckLikelyPasses() {
  const reportPath = path.join(runDir, "artifacts", "test-report.md");
  const reviewPath = path.join(runDir, "artifacts", "review-report.md");
  const releasePath = path.join(runDir, "artifacts", "release-summary.md");
  return existsSync(reportPath) && existsSync(reviewPath) && existsSync(releasePath);
}

function printStatus(data) {
  console.log(`Archive status for ${data.runId}`);
  console.log(`- stage: ${data.stateStage}`);
  console.log(`- done: ${data.done}`);
  console.log(`- gate_ok: ${data.gateOk}`);
  console.log(`- changed_files: ${data.changedFiles.length}`);
  console.log(`- git_status_lines: ${data.gitStatus.length}`);
  console.log(`- can_archive: ${data.canArchive}`);
  if (data.changedFiles.length) {
    console.log("");
    console.log("Changed files:");
    for (const file of data.changedFiles) console.log(`- ${file}`);
  }
  if (data.gitStatus.length) {
    console.log("");
    console.log("Git status:");
    for (const line of data.gitStatus) console.log(`- ${line}`);
  }
  if (data.blockers.length) {
    console.log("");
    console.log("Blockers:");
    for (const blocker of data.blockers) console.log(`- ${blocker}`);
  }
}
