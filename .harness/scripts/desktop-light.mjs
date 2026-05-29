import { spawnSync } from "node:child_process";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:desktop-light -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

run("context-pack", [runId, ...args.filter((arg) => arg !== runId)]);
run("desktop-plan", args);

function run(script, scriptArgs) {
  const result = spawnSync(process.execPath, [resolveScriptPath(root, `${script}.mjs`), ...scriptArgs], {
    cwd: root,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
