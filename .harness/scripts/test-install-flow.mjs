import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "crewup-install-flow-"));
const appDir = path.join(tmpRoot, "app");
const packDir = path.join(tmpRoot, "pack");

await mkdir(appDir, { recursive: true });
await mkdir(packDir, { recursive: true });

try {
  runNpm(["init", "-y"], appDir);
  runGit(["init"], appDir);
  const tarball = packPackage(packDir);
  runNpm(["install", "--no-audit", "--no-fund", "--prefer-offline", tarball], appDir, { timeoutMs: 120000 });

  const firstInstall = runCli(appDir, ["install"]);
  assertIncludes(firstInstall, ".harness/core-lock.json", "initial install writes core lock");
  assertExists(path.join(appDir, ".harness", "core-lock.json"), "installed core lock");
  runCli(appDir, ["init", "--yes", "--agent", "codex"]);
  runCli(appDir, ["check"]);

  await seedRuntimeState(appDir);
  const forceInstall = runCli(appDir, ["install", "--force"]);
  assertIncludes(forceInstall, "preserved .harness runtime/project state", "force preserves runtime state notice");
  assertRuntimeStatePreserved(appDir);
  runCli(appDir, ["check"]);

  await assertCoreDriftDetectedAndRestored(appDir);
  await assertResetReinstallsCleanCore(appDir);

  console.log("install flow test passed");
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

async function seedRuntimeState(targetRoot) {
  const files = [
    [".harness/runs/keep-run/state.json", "{}\n"],
    [".harness/knowledge/custom-note.md", "keep knowledge\n"],
    [".harness/project/custom-state.md", "keep project state\n"],
    [".harness/reports/custom-report.md", "keep report\n"],
    [".harness/dashboard/index.html", "<html>keep dashboard</html>\n"]
  ];
  for (const [relPath, content] of files) {
    const target = path.join(targetRoot, relPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
}

function assertRuntimeStatePreserved(targetRoot) {
  for (const relPath of [
    ".harness/runs/keep-run/state.json",
    ".harness/knowledge/custom-note.md",
    ".harness/project/custom-state.md",
    ".harness/reports/custom-report.md",
    ".harness/dashboard/index.html"
  ]) {
    assertExists(path.join(targetRoot, relPath), `preserved ${relPath}`);
  }
}

async function assertCoreDriftDetectedAndRestored(targetRoot) {
  const target = path.join(targetRoot, ".harness", "scripts", "check.mjs");
  const original = await readFile(target, "utf8");
  await writeFile(target, `${original}\n// simulated installed-core drift\n`, "utf8");
  const failedCheck = runCliWithStatus(targetRoot, ["check"], { expectedStatus: 1 });
  assertIncludes(failedCheck, "CrewUp sealed core files changed", "check detects sealed core drift");
  const restored = runCli(targetRoot, ["install", "--force"]);
  assertIncludes(restored, ".harness/core-lock.json", "force regenerates core lock after drift");
  runCli(targetRoot, ["check"]);
}

async function assertResetReinstallsCleanCore(targetRoot) {
  await mkdir(path.join(targetRoot, ".harness", "runs", "old-run"), { recursive: true });
  await mkdir(path.join(targetRoot, ".harness", "knowledge"), { recursive: true });
  await writeFile(path.join(targetRoot, ".harness", "runs", "old-run", "state.json"), "{}\n", "utf8");
  await writeFile(path.join(targetRoot, ".harness", "knowledge", "custom.md"), "custom knowledge\n", "utf8");
  await writeFile(path.join(targetRoot, ".harness", "scripts", "local-drift.mjs"), "console.log('drift');\n", "utf8");

  const output = runCli(targetRoot, ["install", "--reset"]);
  assertIncludes(output, "reset existing .harness/ before install", "reset notice");
  assertNotExists(path.join(targetRoot, ".harness", "runs", "old-run", "state.json"), "reset removed old run state");
  assertNotExists(path.join(targetRoot, ".harness", "knowledge", "custom.md"), "reset removed old knowledge state");
  assertNotExists(path.join(targetRoot, ".harness", "scripts", "local-drift.mjs"), "reset removed harness drift");
  assertExists(path.join(targetRoot, ".harness", "core-lock.json"), "reset regenerated core lock");
  runCli(targetRoot, ["init", "--yes", "--agent", "codex"]);
  runCli(targetRoot, ["check"]);
}

function runNpm(args, cwd, { timeoutMs = 120000 } = {}) {
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/c", "npm", ...args], { cwd, encoding: "utf8", timeout: timeoutMs })
    : spawnSync("npm", args, { cwd, encoding: "utf8", timeout: timeoutMs });
  if (result.error?.code === "ETIMEDOUT") throw new Error(`npm ${args.join(" ")} timed out after ${timeoutMs}ms`);
  if (result.status !== 0) throw new Error((result.stdout || "") + (result.stderr || "") || `npm ${args.join(" ")} failed`);
  return result;
}

function runGit(args, cwd, { timeoutMs = 30000 } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", timeout: timeoutMs });
  if (result.status !== 0) throw new Error((result.stdout || "") + (result.stderr || "") || `git ${args.join(" ")} failed`);
  return result;
}

function runCli(cwd, args) {
  const result = spawnSync(process.execPath, [path.join(cwd, "node_modules", "crewup-harness", "bin", "crewup.mjs"), ...args], { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stdout || "") + (result.stderr || ""));
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function runCliWithStatus(cwd, args, { expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, [path.join(cwd, "node_modules", "crewup-harness", "bin", "crewup.mjs"), ...args], { cwd, encoding: "utf8" });
  if (result.status !== expectedStatus) {
    throw new Error(`Expected crewup ${args.join(" ")} status ${expectedStatus}, got ${result.status}\n${result.stdout || ""}${result.stderr || ""}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertIncludes(output, expected, label) {
  if (!output.includes(expected)) throw new Error(`Missing ${label}: expected "${expected}" in output:\n${output}`);
}

function assertExists(target, label) {
  if (!existsSync(target)) throw new Error(`Missing ${label}: ${target}`);
}

function assertNotExists(target, label) {
  if (existsSync(target)) throw new Error(`Unexpected ${label}: ${target}`);
}
