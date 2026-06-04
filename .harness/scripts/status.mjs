import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { listRuns, readRunState, writeRunStatus } from "./lib/run-lifecycle.mjs";

const root = process.cwd();
const runId = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (runId) {
  await printRunStatus(runId);
} else {
  await printRunList();
}

async function printRunStatus(currentRunId) {
  const runDir = path.join(root, ".harness", "runs", currentRunId);
  const state = await readRunState(root, currentRunId);
  if (!state) {
    console.error(`Run not found: ${currentRunId}`);
    process.exit(1);
  }
  await writeRunStatus(root, currentRunId, state);
  const statusPath = path.join(runDir, "RUN_STATUS.md");
  console.log(await readFile(statusPath, "utf8"));
}

async function printRunList() {
  const rows = await listRuns(root);
  console.log("# CrewUp Runs");
  console.log("");
  if (!rows.length) {
    console.log("- no runs yet");
    return;
  }

  const groups = [
    ["Active", (state) => ["active", "waiting_user"].includes(state?.status)],
    ["Blocked Or Partial", (state) => ["blocked", "partial"].includes(state?.status)],
    ["Done", (state) => state?.status === "done"],
    ["Canceled", (state) => state?.status === "canceled"],
    ["Failed", (state) => state?.status === "failed"],
    ["Unknown", (state) => !state || !["active", "waiting_user", "blocked", "partial", "done", "canceled", "failed"].includes(state.status)]
  ];

  for (const [label, predicate] of groups) {
    const items = rows.filter((row) => predicate(row.state));
    if (!items.length) continue;
    console.log(`## ${label}`);
    console.log("");
    for (const item of items) {
      if (!item.state) {
        console.log(`- ${item.runId}: missing state.json`);
        continue;
      }
      const archived = item.state.archived ? "archived" : "open";
      const next = item.state.nextAction?.description ? ` | next: ${item.state.nextAction.description}` : "";
      console.log(`- ${item.runId}: ${item.state.status} / ${item.state.stage} / ${item.state.outcome ?? "none"} / ${archived}${next}`);
    }
    console.log("");
  }

  const latest = rows.find((row) => row.state && ["active", "waiting_user", "blocked", "partial"].includes(row.state.status));
  if (latest) {
    const command = latest.state.nextAction?.command || `npx crewup status ${latest.runId}`;
    console.log(`Next suggested command: ${command}`);
  }
}
