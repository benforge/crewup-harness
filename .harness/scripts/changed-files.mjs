import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import {
  configureDelegationGuard,
  evaluateDelegationGuard,
  isBusinessCodePath,
  isHarnessCorePath,
  readNativeState
} from "./lib/delegation-guard.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const command = args.find((arg) => ["add", "list", "clear", "infer"].includes(arg)) ?? "list";
const writeInferred = args.includes("--write");
const files = args
  .filter((arg) => !arg.startsWith("--"))
  .filter((arg) => arg !== runId && arg !== command);

if (!runId) {
  console.error("Usage: npm run harness:changed-files -- <run-id> add <file...>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`run 不存在：${runId}`);
  process.exit(1);
}

const { project_profile: projectProfile } = await loadProjectProfile(root);
configureDelegationGuard(projectProfile);

const manifestPath = path.join(runDir, "logs", "changed-files.json");
const manifest = await readManifest();

if (command === "clear") {
  await writeManifest({ runId, files: [], updatedAt: new Date().toISOString() });
  console.log("已清空 changed-files manifest。");
  process.exit(0);
}

if (command === "add") {
  if (files.length === 0) {
    console.error("请提供要记录的文件路径。");
    process.exit(1);
  }

  const nextFiles = unique([...manifest.files, ...files.map(normalizeRelPath).filter(Boolean)]);
  await guardManifestWrite(nextFiles);
  await writeManifest({ runId, files: nextFiles, updatedAt: new Date().toISOString() });
  console.log(`已记录 ${nextFiles.length} 个本次 run 变更文件。`);
  for (const file of nextFiles) console.log(`- ${file}`);
  process.exit(0);
}

if (command === "infer") {
  const inferred = await inferChangedFiles();
  if (writeInferred) {
    const nextFiles = unique([...manifest.files, ...inferred.candidates.map((item) => item.path)]);
    await guardManifestWrite(nextFiles);
    await writeManifest({ runId, files: nextFiles, inferredAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  console.log(`Inferred changed files for ${runId}:`);
  if (!inferred.candidates.length) {
    console.log("- 无候选业务变更");
  } else {
    for (const item of inferred.candidates) console.log(`- ${item.path} (${item.reason})`);
  }
  if (inferred.excluded.length) {
    console.log("");
    console.log("Excluded:");
    for (const item of inferred.excluded) console.log(`- ${item.path} (${item.reason})`);
  }
  if (writeInferred) console.log("\n已把候选文件写入 changed-files manifest。");
  process.exit(0);
}

console.log(`Changed files for ${runId}:`);
if (!manifest.files.length) {
  console.log("- 无");
} else {
  for (const file of manifest.files) console.log(`- ${file}`);
}

async function guardManifestWrite(nextFiles) {
  const harnessCoreFiles = nextFiles.filter(isHarnessCorePath);
  if (harnessCoreFiles.length > 0) {
    console.error("changed-files guard failed:");
    console.error(`- Harness core files cannot be recorded as project-run changed files: ${harnessCoreFiles.join(", ")}`);
    console.error("- Open a separate CrewUp harness-maintenance run if .harness scripts/config/orchestrator files need changes.");
    process.exit(1);
  }

  const state = await readState();
  const nativeState = await readNativeState(root, runId);
  const issues = evaluateDelegationGuard({
    root,
    runId,
    state,
    workspaceFiles: nextFiles.filter(isBusinessCodePath),
    manifestFiles: nextFiles,
    nativeState,
    targetStage: state.stage ?? "unknown"
  });

  if (issues.length > 0) {
    console.error("changed-files guard failed:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
}

async function readManifest() {
  if (!existsSync(manifestPath)) return { runId, files: [] };
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8"));
    return { runId, files: unique((parsed.files ?? []).map(normalizeRelPath).filter(Boolean)) };
  } catch {
    return { runId, files: [] };
  }
}

async function writeManifest(data) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readState() {
  const statePath = path.join(runDir, "state.json");
  if (!existsSync(statePath)) return {};
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return {};
  }
}

async function inferChangedFiles() {
  const state = await readState();
  const initialDirty = new Set((state.git?.dirtyAtStart ?? []).map(statusPath).filter(Boolean));
  const sourceRequirement = normalizeRelPath(state.sourceRequirement ?? "");
  const lines = gitStatusShort();
  const candidates = [];
  const excluded = [];

  for (const line of lines) {
    const file = statusPath(line);
    if (!file) continue;
    const reason = classify(file, { initialDirty, sourceRequirement });
    if (reason.include) {
      candidates.push({ path: file, reason: reason.reason });
    } else {
      excluded.push({ path: file, reason: reason.reason });
    }
  }

  return {
    candidates: uniqueByPath(candidates),
    excluded: uniqueByPath(excluded)
  };
}

function classify(file, { initialDirty, sourceRequirement }) {
  if (initialDirty.has(file)) return { include: false, reason: "run started with this dirty file" };
  if (file === sourceRequirement) return { include: false, reason: "source requirement file is staged automatically" };
  if (file === `.harness/runs/${runId}` || file.startsWith(`.harness/runs/${runId}/`)) {
    return { include: false, reason: "current run directory is staged automatically" };
  }
  if (file.startsWith(".git/") || file === "node_modules" || file.startsWith("node_modules/")) {
    return { include: false, reason: "ignored workspace internals" };
  }
  if (file.startsWith(".harness/runs/") || file.startsWith(".harness/reports/")) {
    return { include: false, reason: "harness generated state outside current run" };
  }
  if (isHarnessCorePath(file)) {
    return { include: false, reason: "harness core files are not project-run changed files" };
  }
  return { include: true, reason: "changed after run baseline" };
}

function gitStatusShort() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) return [];
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
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

function normalizeRelPath(inputPath) {
  const normalized = String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
  if (!normalized || normalized.includes("..")) return "";
  return normalized;
}

function unique(items) {
  return [...new Set(items)];
}

function uniqueByPath(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}
