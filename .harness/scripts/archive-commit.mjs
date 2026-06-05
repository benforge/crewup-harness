import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { readJsonFile } from "./lib/json.mjs";

const root = process.cwd();
const runId = process.argv.find((arg, index) => index > 1 && !arg.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");
const allowAllWorkspaceChanges = process.argv.includes("--allow-all-workspace-changes");

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:archive-commit -- <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const statePath = path.join(runDir, "state.json");
if (!existsSync(statePath)) {
  console.error(`Missing state.json: ${path.relative(root, statePath)}`);
  process.exit(1);
}

const policy = parseYaml(await readFile(path.join(root, ".harness", "config", "archive-policy.yaml"), "utf8")).archive;
const gitPolicy = policy.git ?? {};
if (!gitPolicy.enabled || !gitPolicy.auto_commit_after_done) {
  console.log("Archive auto-commit is disabled; skipping git commit.");
  process.exit(0);
}

const state = await readJsonFile(statePath);
if (state.stage !== "done" && !dryRun) {
  console.error(`Run is not at done stage; refusing archive commit. Current stage: ${state.stage}`);
  process.exit(1);
}

if (!isInsideGitWorkTree()) {
  await writeAudit({ status: "skipped", reason: "not a git worktree", commit: null, beforeLines: [] });
  console.log("Archive commit skipped: current directory is not a git worktree.");
  process.exit(0);
}

const beforeStatus = git(["status", "--short", "--untracked-files=all"]);
const beforeLines = beforeStatus.stdout.trim().split(/\r?\n/).filter(Boolean);
const untrackedSetupFiles = detectUntrackedSetupFiles(beforeLines);
if (untrackedSetupFiles.length > 0) {
  console.warn("Warning: CrewUp setup files are still untracked. Archive commits only stage run-tracked files by default.");
  console.warn("Recommended: create a separate setup commit for .harness/, AGENTS.md, and .gitignore before relying on archive commits.");
}

if (!hasInitialCommit()) {
  await writeAudit({
    status: "skipped",
    reason: "repository has no initial git commit",
    beforeLines,
    selectedPaths: [],
    unselectedNewChanges: beforeLines.map(statusPath).filter(Boolean),
    commit: null
  });
  console.log("Archive commit skipped: this repository has no initial git commit.");
  console.log("Create an initial setup commit, then rerun `npx crewup archive-commit <run-id>` if you need commit evidence.");
  process.exit(0);
}

if (beforeLines.length === 0 && gitPolicy.skip_when_no_changes !== false) {
  await writeAudit({ status: "skipped", reason: "no workspace changes", beforeLines, commit: null });
  console.log("Archive commit skipped: git worktree has no changes.");
  process.exit(0);
}

const message = renderTemplate(gitPolicy.commit_message_template ?? "chore(harness): archive <run>");
const body = (gitPolicy.commit_body ?? []).map(renderTemplate).join("\n");
const stagePlan = await buildStagePlan({ state, beforeLines });

if (dryRun) {
  console.log("Archive commit dry run:");
  console.log(`- message: ${message}`);
  console.log(`- changed files: ${beforeLines.length}`);
  console.log(`- stage_mode: ${stagePlan.mode}`);
  console.log(`- selected paths: ${stagePlan.selectedPaths.length}`);
  for (const item of stagePlan.selectedPaths) console.log(`  - ${item}`);
  if (stagePlan.unselectedNewChanges.length > 0) {
    console.log(`- unselected new changes: ${stagePlan.unselectedNewChanges.length}`);
    for (const item of stagePlan.unselectedNewChanges) console.log(`  - ${item}`);
  }
  process.exit(0);
}

if (stagePlan.unselectedNewChanges.length > 0 && !allowAllWorkspaceChanges && gitPolicy.fallback_stage_mode === "block") {
  await writeAudit({
    status: "blocked",
    reason: "workspace has changes outside run tracked files",
    beforeLines,
    selectedPaths: stagePlan.selectedPaths,
    unselectedNewChanges: stagePlan.unselectedNewChanges,
    commit: null,
    message,
    body
  });
  console.error("Archive commit blocked: workspace has changes outside this run's changed-files manifest.");
  console.error("Record run-owned business changes first:");
  console.error(`npm run harness:changed-files -- ${runId} add <file...>`);
  console.error("If you intentionally want to commit the whole worktree, run:");
  console.error(`npm run harness:archive-commit -- ${runId} --allow-all-workspace-changes`);
  process.exit(1);
}

if (allowAllWorkspaceChanges || stagePlan.mode === "all_workspace_changes") {
  runGitOrFail(["add", "-A", "-f"]);
} else if (stagePlan.selectedPaths.length > 0) {
  runGitOrFail(["add", "-f", "--", ...stagePlan.selectedPaths]);
}

const stagedBeforeAudit = git(["diff", "--cached", "--name-only"]).stdout.trim().split(/\r?\n/).filter(Boolean);
await writeAudit({
  status: "committed",
  reason: "",
  beforeLines,
  selectedPaths: stagePlan.selectedPaths,
  staged: stagedBeforeAudit,
  commit: "created by this archive commit",
  message,
  body
});
runGitOrFail(["add", "-f", "--", auditRelPath()]);

const staged = git(["diff", "--cached", "--name-only"]).stdout.trim().split(/\r?\n/).filter(Boolean);
if (staged.length === 0 && gitPolicy.skip_when_no_changes !== false) {
  await writeAudit({ status: "skipped", reason: "no staged changes after git add", beforeLines, selectedPaths: stagePlan.selectedPaths, commit: null, message, body });
  console.log("Archive commit skipped: no staged changes.");
  process.exit(0);
}

const commitArgs = ["commit", "-m", message];
if (body.trim()) commitArgs.push("-m", body);
runGitOrFail(commitArgs);
const hash = git(["rev-parse", "--short", "HEAD"]).stdout.trim();
console.log(`Archive commit completed: ${hash}`);

function isInsideGitWorkTree() {
  const result = git(["rev-parse", "--is-inside-work-tree"], { fail: false });
  return result.status === 0 && result.stdout.trim() === "true";
}

function hasInitialCommit() {
  return git(["rev-parse", "--verify", "HEAD"], { fail: false }).status === 0;
}

function git(args, { fail = true } = {}) {
  const result = spawnSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd: root,
    encoding: "utf8"
  });
  if (fail && result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(" ")} failed`;
    throw new Error(message);
  }
  return result;
}

function runGitOrFail(args) {
  try {
    return git(args);
  } catch (error) {
    console.error(`git command failed: git ${args.join(" ")}`);
    console.error(error.message);
    process.exit(1);
  }
}

function detectUntrackedSetupFiles(statusLines) {
  const setupPrefixes = [".harness/AGENTS.md", ".harness/config/", ".harness/scripts/", ".harness/orchestrator/", "AGENTS.md", ".gitignore"];
  return statusLines
    .filter((line) => line.startsWith("?? "))
    .map(statusPath)
    .filter((file) => setupPrefixes.some((prefix) => file === prefix || file.startsWith(prefix)));
}

async function buildStagePlan({ state, beforeLines }) {
  const mode = allowAllWorkspaceChanges ? "all_workspace_changes" : (gitPolicy.stage_mode ?? "run_tracked_files");
  if (mode === "all_workspace_changes") {
    return { mode, selectedPaths: ["."], unselectedNewChanges: [] };
  }

  const selectedPaths = unique([
    ...((gitPolicy.always_stage ?? []).map((item) => renderTemplateWithState(item, state))),
    ...await readChangedFilesManifest(),
    renderTemplate(gitPolicy.tracked_files_manifest ?? ".harness/runs/<run>/logs/changed-files.json")
  ])
    .map(normalizeRelPath)
    .filter(Boolean)
    .filter((item) => existsSync(path.join(root, item)));

  const initialDirty = new Set((state.git?.dirtyAtStart ?? []).map(statusPath).filter(Boolean));
  const unselectedNewChanges = beforeLines
    .map(statusPath)
    .filter(Boolean)
    .filter((item) => !pathMatchesAny(item, initialDirty))
    .filter((item) => !pathMatchesAny(item, selectedPaths));

  return { mode, selectedPaths, unselectedNewChanges };
}

async function readChangedFilesManifest() {
  const manifestRel = renderTemplate(gitPolicy.tracked_files_manifest ?? ".harness/runs/<run>/logs/changed-files.json");
  const manifestPath = path.join(root, manifestRel);
  if (!existsSync(manifestPath)) return [];
  try {
    const parsed = await readJsonFile(manifestPath);
    return Array.isArray(parsed.files) ? parsed.files : [];
  } catch {
    return [];
  }
}

async function writeAudit(data) {
  const target = path.join(root, auditRelPath());
  await assertInsideWorkspace(target);
  await mkdir(path.dirname(target), { recursive: true });
  const lines = [
    "# Archive Git Commit Audit",
    "",
    `- runId: ${runId}`,
    `- status: ${data.status}`,
    `- reason: ${data.reason || "none"}`,
    `- commit: ${data.commit ?? "not generated"}`,
    `- generatedAt: ${new Date().toISOString()}`,
    "",
    "## Commit Message",
    "",
    `- ${data.message ?? renderTemplate(gitPolicy.commit_message_template ?? "chore(harness): archive <run>")}`,
    "",
    "## Commit Body",
    "",
    data.body || "none",
    "",
    "## Workspace changes before archive",
    "",
    data.beforeLines?.length ? data.beforeLines.map((line) => `- ${line}`).join("\n") : "- none",
    "",
    "## Selected staged paths",
    "",
    data.selectedPaths?.length ? data.selectedPaths.map((line) => `- ${line}`).join("\n") : "- none",
    "",
    "## Unselected new changes",
    "",
    data.unselectedNewChanges?.length ? data.unselectedNewChanges.map((line) => `- ${line}`).join("\n") : "- none",
    "",
    "## Staged files",
    "",
    data.staged?.length ? data.staged.map((line) => `- ${line}`).join("\n") : "- none",
    ""
  ];
  await writeFile(target, `${lines.join("\n")}\n`, "utf8");
}

function auditRelPath() {
  return renderTemplate(gitPolicy.audit_file ?? ".harness/runs/<run>/logs/archive/git-commit.md");
}

async function assertInsideWorkspace(target) {
  const resolved = path.resolve(target);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
}

function renderTemplate(text) {
  return String(text ?? "").replaceAll("<run>", runId);
}

function renderTemplateWithState(text, state) {
  return renderTemplate(text).replaceAll("<sourceRequirement>", state.sourceRequirement ?? "");
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

function statusPath(line) {
  const value = String(line ?? "");
  if (!value.trim()) return "";
  const rename = value.match(/^R.\s+(.+?)\s+->\s+(.+)$/);
  if (rename) return normalizeRelPath(unquoteStatusPath(rename[2]));
  const status = value.match(/^.{1,2}\s+(.+)$/);
  return normalizeRelPath(unquoteStatusPath(status ? status[1] : value));
}

function unquoteStatusPath(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith("\"") || !trimmed.endsWith("\"")) return trimmed;
  const inner = trimmed.slice(1, -1);
  const bytes = [];
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] === "\\" && /[0-7]/.test(inner[index + 1] ?? "")) {
      const octal = inner.slice(index + 1).match(/^[0-7]{1,3}/)?.[0] ?? "";
      bytes.push(Number.parseInt(octal, 8));
      index += octal.length;
    } else if (inner[index] === "\\" && inner[index + 1]) {
      bytes.push(inner.charCodeAt(index + 1));
      index += 1;
    } else {
      bytes.push(inner.charCodeAt(index));
    }
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

function pathMatchesAny(file, selectedPaths) {
  const candidates = Array.isArray(selectedPaths) ? selectedPaths : [...selectedPaths];
  return candidates.some((candidate) => file === candidate || file.startsWith(`${candidate.replace(/\/+$/, "")}/`));
}

function unique(items) {
  return [...new Set(items)];
}
