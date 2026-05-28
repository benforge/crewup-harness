import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

async function countMarkdown(dir) {
  if (!existsSync(dir)) return 0;
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
}

const backlogRoot = path.join(root, ".harness", "backlog");
const runsRoot = path.join(root, ".harness", "runs");
const queues = ["new", "ready", "in-progress", "review", "done"];

console.log("Harness 状态");
console.log("");

for (const queue of queues) {
  const total = await countMarkdown(path.join(backlogRoot, queue));
  console.log(`- backlog/${queue}: ${total}`);
}

console.log("");
console.log("Runs");

if (!existsSync(runsRoot)) {
  console.log("- 暂无 runs 目录");
  process.exit(0);
}

const runEntries = await readdir(runsRoot, { withFileTypes: true });
const runs = runEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

if (runs.length === 0) {
  console.log("- 暂无 run");
  process.exit(0);
}

for (const run of runs) {
  const statePath = path.join(runsRoot, run, "state.json");
  if (!existsSync(statePath)) {
    console.log(`- ${run}: 缺少 state.json`);
    continue;
  }
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const native = await readNativeSummary(path.join(runsRoot, run, "logs", "native-subagents", "native-state.json"));
  console.log(`- ${run}: ${state.status} / ${state.stage}${native ? ` / native ${native}` : ""}`);
}

async function readNativeSummary(nativePath) {
  if (!existsSync(nativePath)) return "";
  try {
    const native = JSON.parse(await readFile(nativePath, "utf8"));
    const agents = native.agents ?? [];
    const running = agents.filter((agent) => agent.status === "running").length;
    const waiting = agents.filter((agent) => agent.status === "waiting_review").length;
    const open = agents.filter((agent) => !["closed"].includes(agent.status)).length;
    if (running || waiting || open) return `open=${open}, running=${running}, waiting_review=${waiting}`;
    return "closed";
  } catch {
    return "invalid-state";
  }
}
