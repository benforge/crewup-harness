import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const backlogRoot = path.join(root, ".harness", "backlog");
const runsRoot = path.join(root, ".harness", "runs");
const queues = ["new", "ready", "in-progress", "review", "done"];

console.log("# Harness Status");
console.log("");

console.log("## Backlog");
for (const queue of queues) {
  const total = await countMarkdown(path.join(backlogRoot, queue));
  console.log(`- backlog/${queue}: ${total}`);
}

console.log("");
console.log("## Runs");

if (!existsSync(runsRoot)) {
  console.log("- no runs directory");
  process.exit(0);
}

const runs = await readdir(runsRoot, { withFileTypes: true });
const runNames = runs.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

if (runNames.length === 0) {
  console.log("- no runs yet");
  process.exit(0);
}

for (const runId of runNames) {
  const statePath = path.join(runsRoot, runId, "state.json");
  if (!existsSync(statePath)) {
    console.log(`- ${runId}: missing state.json`);
    continue;
  }

  const state = JSON.parse(await readFile(statePath, "utf8"));
  const native = await readNativeSummary(path.join(runsRoot, runId, "logs", "native-subagents", "native-state.json"));
  const token = await readTokenSummary(path.join(runsRoot, runId, "logs", "token-ledger.json"));
  const budget = await readBudgetSummary(path.join(runsRoot, runId, "logs", "context", "context-budget.json"));

  console.log(`- ${runId}: ${state.status} / ${state.stage}${native ? ` / native ${native}` : ""}${token ? ` / tokens ${token}` : ""}${budget ? ` / context ${budget}` : ""}`);
}

async function countMarkdown(dir) {
  if (!existsSync(dir)) return 0;
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
}

async function readNativeSummary(nativePath) {
  if (!existsSync(nativePath)) return "";
  try {
    const native = JSON.parse(await readFile(nativePath, "utf8"));
    const agents = native.agents ?? [];
    const running = agents.filter((agent) => agent.status === "running").length;
    const waiting = agents.filter((agent) => agent.status === "waiting_review").length;
    const open = agents.filter((agent) => agent.status !== "closed").length;
    if (running || waiting || open) return `open=${open}, running=${running}, waiting_review=${waiting}`;
    return "closed";
  } catch {
    return "invalid-state";
  }
}

async function readTokenSummary(tokenPath) {
  if (!existsSync(tokenPath)) return "";
  try {
    const token = JSON.parse(await readFile(tokenPath, "utf8"));
    return `${token.estimate?.estimatedTokens ?? 0} tokens`;
  } catch {
    return "invalid";
  }
}

async function readBudgetSummary(budgetPath) {
  if (!existsSync(budgetPath)) return "";
  try {
    const budget = JSON.parse(await readFile(budgetPath, "utf8"));
    const total = (budget.agents ?? []).reduce((sum, item) => sum + Number(item.estimatedTokens ?? 0), 0);
    return `${total} tokens`;
  } catch {
    return "invalid";
  }
}
