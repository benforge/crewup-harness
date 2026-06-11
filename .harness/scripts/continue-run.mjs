import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";
import { modeLabel } from "./lib/workflow-modes.mjs";

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

let inheritedProfile = null;
try {
  const sourceState = JSON.parse(readFileSync(path.join(root, ".harness", "runs", sourceRunId, "state.json"), "utf8"));
  inheritedProfile = sourceState.workflowProfile || sourceState.profile || null;
} catch {
  inheritedProfile = null;
}

const profileArgs = inheritedProfile ? [`--profile=${inheritedProfile}`] : [];
if (inheritedProfile) {
  console.log(`Continuing ${sourceRunId} with inherited mode: ${modeLabel({ profile: inheritedProfile })} (profile: ${inheritedProfile})`);
}
const result = spawnSync(process.execPath, [
  resolveScriptPath(root, "run.mjs"),
  `--from-run=${sourceRunId}`,
  ...profileArgs,
  text
], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);
