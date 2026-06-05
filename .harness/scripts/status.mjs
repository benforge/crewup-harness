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
    console.log("No runs yet.");
    console.log("");
    console.log('Create one: `npx crewup run "..."`');
    return;
  }

  const groups = [
    ["Needs Attention", (state) => ["waiting_user", "blocked", "partial", "failed"].includes(state?.status)],
    ["Active", (state) => state?.status === "active"],
    ["Completed", (state) => ["done", "canceled"].includes(state?.status)],
    ["Unknown", (state) => !state || !["active", "waiting_user", "blocked", "partial", "done", "canceled", "failed"].includes(state.status)]
  ];

  for (const [label, predicate] of groups) {
    const items = rows.filter((row) => predicate(row.state));
    if (!items.length) continue;
    console.log(`## ${label}`);
    console.log("");
    console.log("| Run ID | Status | Stage | Owner | Outcome | Archive | Next |");
    console.log("| --- | --- | --- | --- | --- | --- | --- |");
    for (const item of items) {
      if (!item.state) {
        console.log(`| \`${item.runId}\` | missing | - | - | - | - | check state.json |`);
        continue;
      }
      const archiveState = item.state.archived ? "archived" : "open";
      const owner = ownerForStage(item.state.stage);
      const next = item.state.nextAction?.command || readableNext(item.state);
      console.log([
        `\`${item.runId}\``,
        labelForStatus(item.state.status),
        item.state.stage ?? "unknown",
        owner,
        item.state.outcome ?? "none",
        archiveState,
        next ? `\`${next}\`` : "-"
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    console.log("");
  }

  const latest = rows.find((row) => row.state && ["active", "waiting_user", "blocked", "partial"].includes(row.state.status));
  console.log("## How To Use");
  console.log("");
  if (latest) {
    const command = latest.state.nextAction?.command || `npx crewup status ${latest.runId}`;
    console.log(`- Suggested next command: \`${command}\``);
  }
  console.log("- List all runs: `npx crewup status`");
  console.log("- Show one run: `npx crewup status <run-id>`");
  console.log("- Alias: `npx crewup runs`");
}

function ownerForStage(stage) {
  return {
    intake: "main",
    requirements_plan: "requirements-plan",
    requirements_confirm: "requirements",
    plan: "architect",
    implement: "implementation agents",
    verify: "tester",
    review: "reviewer",
    release: "release",
    done: "main"
  }[stage] ?? "unknown";
}

function labelForStatus(status) {
  return {
    active: "active",
    waiting_user: "waiting user",
    blocked: "blocked",
    partial: "partial",
    done: "done",
    canceled: "canceled",
    failed: "failed"
  }[status] ?? (status || "unknown");
}

function readableNext(state) {
  if (state.status === "done" || state.status === "canceled" || state.status === "failed") return "";
  if (state.status === "blocked") return "archive or continue after fixing blocker";
  return state.nextAction?.description || "";
}
