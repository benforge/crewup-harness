import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sortByExecutionOrder } from "./lib/execution-order.mjs";
import { implementationPlanSkipReason, isImplementationAgentUnassigned } from "./lib/implementation-plan-scope.mjs";
import { readRunState } from "./lib/run-lifecycle.mjs";

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
const runState = await readRunState(root, runId).catch(() => null);
const report = finalRunReport(runState) ?? buildReport(state);

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

function buildReport(current) {
  const agents = current.agents ?? [];
  const byAgent = new Map(agents.map((agent) => [agent.agent, agent]));
  const repairPlan = repairPlanState(agents, byAgent);
  const runnable = [];
  const blocked = [];
  const completed = [];
  const active = [];
  const skipped = [];
  const skippedSet = new Set();
  const repair = repairFeedbackFor(agents, repairPlan);
  const hasPendingRepair = repair.required;

  for (const agent of sortByExecutionOrder(agents.map((item) => item.agent)).map((id) => byAgent.get(id)).filter(Boolean)) {
    if (hasPendingRepair && ["reviewer", "release"].includes(agent.agent)) {
      blocked.push({
        agent: agent.agent,
        status: agent.status ?? "planned",
        missing: repair.sources
      });
      continue;
    }
    if (hasCompletedResult(agent, repairPlan)) {
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
    const missing = missingPrerequisites(agent, byAgent, skippedSet, repairPlan);
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
    action: actionFor({ runnable, active, blocked, repair }),
    userInputRequired: false,
    repairRequired: repair.required,
    repair,
    waitFor: runnable.length === 0 ? active.map((item) => item.agent) : [],
    instruction: instructionFor({ runnable, active, blocked, repair }),
    runnable,
    active,
    blocked,
    completed,
    skipped,
    next: runnable[0]?.agent ?? null
  };
}

function finalRunReport(current) {
  if (!current || (!current.archived && !["done", "canceled", "failed"].includes(current.status))) return null;
  const done = current.status === "done" && current.outcome === "success" && current.archived;
  return {
    runId: current.runId ?? runId,
    generatedAt: new Date().toISOString(),
    action: done ? "done" : "closed",
    userInputRequired: false,
    repairRequired: false,
    repair: {
      required: false,
      sources: [],
      targetAgents: [],
      feedback: [],
      command: `npx crewup repair-plan ${runId}`
    },
    waitFor: [],
    instruction: done
      ? "Run is already done and archived. Do not start more agents; create a continuation run for follow-up work."
      : "Run is closed. Do not start more agents unless the run is explicitly reopened.",
    runnable: [],
    active: [],
    blocked: [],
    completed: [],
    skipped: [],
    next: null,
    state: {
      status: current.status,
      stage: current.stage,
      outcome: current.outcome,
      archived: Boolean(current.archived)
    }
  };
}

function missingPrerequisites(agent, byAgent, skippedSet = new Set(), repairPlan = null) {
  const missing = [];
  for (const prerequisite of agent.requires_completed_agents ?? []) {
    if (skippedSet.has(prerequisite)) continue;
    if (isImplementationAgentUnassigned(prerequisite, { root, runId })) continue;
    if (!hasCompletedResult(byAgent.get(prerequisite), repairPlan)) missing.push(prerequisite);
  }
  return missing;
}

function hasCompletedResult(agent, repairPlan = null) {
  if (!agent) return false;
  if (repairPlan?.staleVerificationAgents?.has(agent.agent)) return false;
  return Boolean(agent.handle && agent.result_captured_at && agent.result_status === "completed" && !agentRequiresRepair(agent));
}

function printReport(report) {
  console.log(`Next runnable agents: ${report.runId}`);
  console.log(`- action: ${report.action}`);
  console.log(`- user input required: ${report.userInputRequired ? "yes" : "no"}`);
  if (report.repairRequired) {
    console.log(`- repair required: yes`);
    console.log(`- repair targets: ${report.repair.targetAgents.length ? report.repair.targetAgents.join(", ") : "(missing)"}`);
    console.log(`- repair command: ${report.repair.command}`);
  }
  if (report.waitFor.length) console.log(`- wait for: ${report.waitFor.join(", ")}`);
  console.log(`- instruction: ${report.instruction}`);
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

function actionFor({ runnable, active, blocked, repair }) {
  if (repair.required) return "repair";
  if (runnable.length > 0) return "spawn";
  if (active.length > 0) return "wait";
  if (blocked.length > 0) return "blocked";
  return "idle";
}

function instructionFor({ runnable, active, blocked, repair }) {
  if (repair.required) return `Run repair-plan and route fixes to owner agents: ${repair.targetAgents.join(", ") || "(missing targetAgents)"}. Do not start reviewer/release until repairs are completed and verification is rerun.`;
  if (runnable.length > 0) return `Start only the next runnable agent: ${runnable[0].agent}.`;
  if (active.length > 0) return `Wait for active agent result: ${active.map((item) => item.agent).join(", ")}. Do not ask the user to choose downstream branches.`;
  if (blocked.length > 0) return "No agent is runnable because prerequisites are missing; capture upstream results first.";
  return "No runnable, active, or blocked agents remain.";
}

function repairFeedbackFor(agents, repairPlan = null) {
  const feedback = [];
  for (const agent of agents) {
    if (!["tester", "reviewer"].includes(agent.agent)) continue;
    if (repairPlan?.staleVerificationAgents?.has(agent.agent)) continue;
    if (!agentRequiresRepair(agent)) continue;
    const payload = readResultPayload(agent);
    const requiredFixes = Array.isArray(payload.requiredFixes) ? payload.requiredFixes : [];
    const targetAgents = [
      ...new Set([
        ...asArray(payload.targetAgents),
        ...requiredFixes.flatMap((fix) => asArray(fix.targetAgents))
      ].filter(Boolean))
    ];
    feedback.push({
      agent: agent.agent,
      targetAgents,
      requiredFixes: requiredFixes.length,
      blockingIssues: asArray(payload.blockingIssues).length
    });
  }
  if (repairPlan?.required) {
    feedback.push({
      agent: "repair-plan",
      targetAgents: repairPlan.targetAgents,
      requiredFixes: repairPlan.pendingTargetAgents.length,
      blockingIssues: 0
    });
  }
  return {
    required: feedback.length > 0,
    sources: feedback.map((item) => item.agent),
    targetAgents: [...new Set(feedback.flatMap((item) => item.targetAgents))],
    feedback,
    command: `npx crewup repair-plan ${runId}`
  };
}

function repairPlanState(agents, byAgent) {
  const planPath = path.join(root, ".harness", "runs", runId, "logs", "repair-plan.json");
  const empty = {
    exists: false,
    required: false,
    targetAgents: [],
    pendingTargetAgents: [],
    repairedTargetAgents: [],
    staleVerificationAgents: new Set()
  };
  if (!existsSync(planPath)) return empty;

  let plan = null;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return empty;
  }

  const generatedAtMs = Date.parse(plan.generatedAt ?? "");
  if (!Number.isFinite(generatedAtMs)) return empty;
  const targetAgents = asArray(plan.targetAgents).map((item) => String(item).trim()).filter(Boolean);
  if (targetAgents.length === 0) return empty;

  const pendingTargetAgents = [];
  const repairedTargetAgents = [];
  let latestRepairMs = generatedAtMs;
  for (const target of targetAgents) {
    const agent = byAgent.get(target);
    const capturedMs = Date.parse(agent?.result_captured_at ?? "");
    const repaired = Boolean(
      agent?.handle
      && agent?.result_status === "completed"
      && Number.isFinite(capturedMs)
      && capturedMs > generatedAtMs
      && !agentRequiresRepair(agent)
    );
    if (repaired) {
      repairedTargetAgents.push(target);
      latestRepairMs = Math.max(latestRepairMs, capturedMs);
    } else {
      pendingTargetAgents.push(target);
    }
  }

  if (pendingTargetAgents.length > 0) {
    return {
      exists: true,
      required: true,
      targetAgents,
      pendingTargetAgents,
      repairedTargetAgents,
      staleVerificationAgents: new Set()
    };
  }

  const staleVerificationAgents = new Set();
  const tester = byAgent.get("tester");
  const testerMs = Date.parse(tester?.result_captured_at ?? "");
  const testerClean = Boolean(
    tester?.handle
    && tester?.result_status === "completed"
    && Number.isFinite(testerMs)
    && testerMs > latestRepairMs
    && !agentRequiresRepair(tester)
  );
  if (tester && !testerClean) staleVerificationAgents.add("tester");

  const reviewer = byAgent.get("reviewer");
  const reviewerMs = Date.parse(reviewer?.result_captured_at ?? "");
  const reviewerClean = Boolean(
    reviewer?.handle
    && reviewer?.result_status === "completed"
    && Number.isFinite(reviewerMs)
    && reviewerMs > Math.max(latestRepairMs, testerClean ? testerMs : latestRepairMs)
    && !agentRequiresRepair(reviewer)
  );
  if (reviewer && !reviewerClean) staleVerificationAgents.add("reviewer");

  return {
    exists: true,
    required: false,
    targetAgents,
    pendingTargetAgents,
    repairedTargetAgents,
    staleVerificationAgents
  };
}

function agentRequiresRepair(agent) {
  const payload = readResultPayload(agent);
  return Boolean(
    payload.fixRequired === true
    || asArray(payload.requiredFixes).length > 0
    || asArray(payload.blockingIssues).length > 0
  );
}

function readResultPayload(agent) {
  const target = agent?.result_json_path ? path.join(root, agent.result_json_path) : "";
  if (!target || !existsSync(target)) return {};
  try {
    return JSON.parse(readFileSync(target, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return {};
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function stripBom(text) {
  return String(text ?? "").replace(/^\uFEFF/, "");
}
