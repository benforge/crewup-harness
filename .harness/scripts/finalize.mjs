import { spawnSync } from "node:child_process";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const passthrough = args.filter((arg) => arg.startsWith("--"));

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:finalize -- <run-id>");
  process.exit(1);
}

const transitionArgs = [
  resolveScriptPath(root, "transition.mjs"),
  runId,
  "--to=done",
  ...passthrough
];

console.log(`正在完成 run：${runId}`);
console.log("将执行 done 门禁、product-sync，并在归档策略允许时自动提交 git。");

const result = spawnSync(process.execPath, transitionArgs, {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);
