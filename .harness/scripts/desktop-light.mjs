import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:desktop-light -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

run("context-pack", [runId, ...args.filter((arg) => arg !== runId)]);
run("desktop-plan", args);

function run(script, scriptArgs) {
  const result = spawnSync(process.execPath, [`.harness/scripts/${script}.mjs`, ...scriptArgs], {
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
