import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const reason = valueOf("--reason=") ?? "user canceled";

if (!runId) {
  console.error('Usage: npx crewup cancel <run-id> --reason="scope changed"');
  process.exit(1);
}

if (!existsSync(path.join(root, ".harness", "runs", runId))) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [
  resolveScriptPath(root, "archive.mjs"),
  runId,
  "--outcome=canceled",
  `--reason=${reason}`
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);

function valueOf(prefix) {
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}
