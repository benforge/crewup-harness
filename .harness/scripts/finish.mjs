import { spawnSync } from "node:child_process";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const passthrough = args.filter((arg) => arg.startsWith("--"));

if (!runId) {
  console.error("Please provide runId, for example: npx crewup finish <run-id>");
  process.exit(1);
}

console.log(`Finishing run: ${runId}`);
console.log("CrewUp will run the done gate, product sync, archive summary, and archive commit when policy allows it.");

const transition = spawnSync(process.execPath, [
  resolveScriptPath(root, "transition.mjs"),
  runId,
  "--to=done",
  ...passthrough
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

if ((transition.status ?? 1) !== 0) process.exit(transition.status ?? 1);

const archive = spawnSync(process.execPath, [
  resolveScriptPath(root, "archive.mjs"),
  runId,
  "--outcome=success",
  "--reason=run reached done"
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

process.exit(archive.status ?? 1);
