import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const sourceRunId = args.find((arg) => !arg.startsWith("--"));
const text = args.filter((arg) => arg !== sourceRunId && !arg.startsWith("--")).join(" ").trim();

if (!sourceRunId || !text) {
  console.error('Usage: npx crewup continue <source-run-id> "Continue from the previous blocker..."');
  process.exit(1);
}

if (!existsSync(path.join(root, ".harness", "runs", sourceRunId))) {
  console.error(`Source run not found: ${sourceRunId}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [
  resolveScriptPath(root, "run.mjs"),
  `--from-run=${sourceRunId}`,
  text
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);
