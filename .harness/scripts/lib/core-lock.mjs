import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const coreLockRelPath = ".harness/core-lock.json";

const coreRoots = [
  ".harness/AGENTS.md",
  ".harness/HARNESS-ARCHITECTURE-AND-USAGE.md",
  ".harness/HARNESS-WORKFLOW.md",
  ".harness/agents",
  ".harness/config",
  ".harness/contracts",
  ".harness/orchestrator",
  ".harness/rules",
  ".harness/scripts",
  ".harness/skills",
  ".harness/templates"
];

const textFilePattern = /\.(md|yaml|yml|json|mjs|js)$/i;

export async function writeCoreLock(root, { source = "crewup install" } = {}) {
  const files = await collectCoreFiles(root);
  const lock = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source,
    files
  };
  const target = path.join(root, coreLockRelPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return lock;
}

export async function verifyCoreLock(root) {
  const target = path.join(root, coreLockRelPath);
  if (!existsSync(target)) {
    return {
      ok: false,
      missing: true,
      problems: [
        "Missing .harness/core-lock.json.",
        "Run `npx crewup install --force` to refresh the sealed CrewUp core before starting or continuing project runs."
      ],
      changed: [],
      added: [],
      removed: []
    };
  }

  let lock;
  try {
    lock = JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    return {
      ok: false,
      problems: [`Invalid .harness/core-lock.json: ${error.message}`],
      changed: [],
      added: [],
      removed: []
    };
  }

  const expected = new Map((lock.files ?? []).map((item) => [item.path, item.sha256]));
  const current = new Map((await collectCoreFiles(root)).map((item) => [item.path, item.sha256]));
  const changed = [];
  const removed = [];
  const added = [];

  for (const [relPath, sha256] of expected.entries()) {
    if (!current.has(relPath)) removed.push(relPath);
    else if (current.get(relPath) !== sha256) changed.push(relPath);
  }
  for (const relPath of current.keys()) {
    if (!expected.has(relPath)) added.push(relPath);
  }

  const problems = [];
  if (changed.length) problems.push(`CrewUp sealed core files changed: ${changed.join(", ")}`);
  if (removed.length) problems.push(`CrewUp sealed core files removed: ${removed.join(", ")}`);
  if (added.length) problems.push(`CrewUp sealed core files added outside install: ${added.join(", ")}`);
  if (problems.length > 0) {
    problems.push("Project runs must not patch CrewUp core. Restore with `npx crewup install --force`, or fix CrewUp in the CrewUp source repository and publish an upgrade.");
  }

  return {
    ok: problems.length === 0,
    lock,
    problems,
    changed,
    added,
    removed
  };
}

export async function collectCoreFiles(root) {
  const files = [];
  for (const rel of coreRoots) {
    const target = path.join(root, rel);
    if (!existsSync(target)) continue;
    files.push(...await collectFiles(root, target));
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function collectFiles(root, target) {
  const entries = await readdir(target, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    const rel = normalizeRelPath(path.relative(root, target));
    if (!rel || rel === coreLockRelPath || !textFilePattern.test(rel)) return [];
    return [{ path: rel, sha256: await hashFile(target) }];
  }

  const files = [];
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, child));
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = normalizeRelPath(path.relative(root, child));
    if (!rel || rel === coreLockRelPath || !textFilePattern.test(rel)) continue;
    files.push({ path: rel, sha256: await hashFile(child) });
  }
  return files;
}

async function hashFile(target) {
  const content = await readFile(target);
  return createHash("sha256").update(content).digest("hex");
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").trim();
}
