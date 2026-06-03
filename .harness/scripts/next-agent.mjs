import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { sortByExecutionOrder } from "./lib/execution-order.mjs";
import { implementationPlanSkipReason, isImplementationAgentUnassigned } from "./lib/implementation-plan-scope.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const json = args.includes("--json");

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:next-agent -- <run-id>");
  process.exit(1);
}

const statePath = path.join(root, ".harness", "runs", runId, "logs", "native-subagents", "native-state.json");
if (!existsSync(statePath)) {
  console.error(`Missing native state: ${path.relative(root, statePath)}`);
  console.error(`Run first: npm run harness:native-plan -- ${runId}`);
  process.exit(1);
}

const state = JSON.parse(stripBom(await readFile(statePath, "utf8")));
const report = buildReport(state);

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

function buildReport(current) {
  const agents = current.agents ?? [];
  const byAgent = new Map(agents.map((agent) => [agent.agent, agent]));
  const runnable = [];
  const blocked = [];
  const completed = [];
  const active = [];
  const skipped = [];
  const skippedSet = new Set();

  for (const agent of sortByExecutionOrder(agents.map((item) => item.agent)).map((id) => byAgent.get(id)).filter(Boolean)) {
    if (hasCompletedResult(agent)) {
      completed.push(agent.agent);
      continue;
    }
    if (isImplementationAgentUnassigned(agent.agent, { root, runId: current.runId ?? runId })) {
      skipped.push({
        agent: agent.agent,
        status: "skipped",
        reason: implementationPlanSkipReason(agent.agent)
      });
      skippedSet.add(agent.agent);
      continue;
    }
    if (["running", "waiting_review", "ready_to_close"].includes(agent.status)) {
      active.push({
        agent: agent.agent,
        status: agent.status,
        handle: agent.handle ?? null
      });
      continue;
    }
    const missing = missingPrerequisites(agent, byAgent, skippedSet);
    if (missing.length === 0) {
      runnable.push({
        agent: agent.agent,
        status: agent.status ?? "planned",
        prompt_path: agent.prompt_path,
        requires_completed_agents: agent.requires_completed_agents ?? []
      });
    } else {
      blocked.push({
        agent: agent.agent,
        status: agent.status ?? "planned",
        missing
      });
    }
  }

  return {
    runId: current.runId ?? runId,
    generatedAt: new Date().toISOString(),
    runnable,
    active,
    blocked,
    completed,
    skipped,
    next: runnable[0]?.agent ?? null
  };
}

function missingPrerequisites(agent, byAgent, skippedSet = new Set()) {
  const missing = [];
  for (const prerequisite of agent.requires_completed_agents ?? []) {
    if (skippedSet.has(prerequisite)) continue;
    if (isImplementationAgentUnassigned(prerequisite, { root, runId })) continue;
    if (!hasCompletedResult(byAgent.get(prerequisite))) missing.push(prerequisite);
  }
  return missing;
}

function hasCompletedResult(agent) {
  return Boolean(agent?.handle && agent?.result_captured_at && agent?.result_status === "completed");
}

function printReport(report) {
  console.log(`Next runnable agents: ${report.runId}`);
  console.log(`- next: ${report.next ?? "(none)"}`);
  console.log(`- runnable: ${report.runnable.length ? report.runnable.map((item) => item.agent).join(", ") : "(none)"}`);
  if (report.active.length) {
    console.log("- active:");
    for (const item of report.active) console.log(`  - ${item.agent}: ${item.status}, handle=${item.handle ?? "none"}`);
  }
  if (report.blocked.length) {
    console.log("- blocked:");
    for (const item of report.blocked) console.log(`  - ${item.agent}: missing ${item.missing.join(", ")}`);
  }
  if (report.skipped.length) {
    console.log("- skipped:");
    for (const item of report.skipped) console.log(`  - ${item.agent}: ${item.reason}`);
  }
  if (report.completed.length) console.log(`- completed: ${report.completed.join(", ")}`);
}

function stripBom(text) {
  return String(text ?? "").replace(/^\uFEFF/, "");
}
