import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readRunState } from "./lib/run-lifecycle.mjs";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const json = args.includes("--json");

if (!runId) {
  console.error("Please provide runId, for example: npx crewup explain <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const state = await readRunState(root, runId);
const nextAgent = runJson("next-agent.mjs", [runId, "--json"]);
const gate = runText("gate-check.mjs", [runId]);
const nativeDiagnostics = runText("native-state.mjs", [runId, "diagnose"]);
const nativeState = await readNativeState();
const health = buildHealth({ state, nextAgent, gate, nativeDiagnostics, nativeState });

if (json) {
  console.log(JSON.stringify(health, null, 2));
} else {
  printHealth(health);
}

function buildHealth({ state: currentState, nextAgent: next, gate: gateResult, nativeDiagnostics: nativeDiag, nativeState: native }) {
  const gateIssues = extractBullets(gateResult.output, "Quality gate failed:");
  const nativeIssues = extractBullets(nativeDiag.output, "Issues:");
  const done = currentState?.status === "done" && currentState?.outcome === "success" && currentState?.archived === true;
  const canceled = currentState?.status === "canceled" || currentState?.outcome === "canceled";
  const failed = currentState?.status === "failed" || currentState?.outcome === "failed";
  const partial = currentState?.status === "partial" || currentState?.outcome === "partial";
  const blocked = currentState?.status === "blocked" || currentState?.outcome === "blocked";
  const closed = next?.action === "closed" || currentState?.archived === true || canceled || failed;
  const verdict = verdictFor({ state: currentState, next, gateResult, done, canceled, failed, partial, blocked, closed });

  return {
    runId,
    status: currentState?.status ?? "unknown",
    stage: currentState?.stage ?? "unknown",
    outcome: currentState?.outcome ?? "none",
    archived: Boolean(currentState?.archived),
    verdict,
    dispatch: {
      action: next?.action ?? "unknown",
      next: next?.next ?? null,
      runnable: (next?.runnable ?? []).map((item) => item.agent),
      waitFor: next?.waitFor ?? [],
      repairRequired: Boolean(next?.repairRequired),
      repairTargets: next?.repair?.targetAgents ?? []
    },
    gate: {
      passed: gateResult.status === 0,
      issues: gateIssues
    },
    native: {
      diagnosticsPassed: nativeDiag.status === 0 && nativeIssues.length === 0,
      issues: nativeIssues,
      active: (native?.agents ?? [])
        .filter((agent) => ["running", "waiting_review", "ready_to_close"].includes(agent.status))
        .map((agent) => ({ agent: agent.agent, status: agent.status, result: agent.result_status ?? "none" }))
    },
    paths: {
      status: `.harness/runs/${runId}/RUN_STATUS.md`,
      summary: `.harness/runs/${runId}/RUN_SUMMARY.md`,
      report: `.harness/runs/${runId}/logs/run-report.md`,
      repairPlan: `.harness/runs/${runId}/logs/repair-plan.md`
    },
    explanation: explanationFor({ state: currentState, next, gateResult, gateIssues, nativeIssues, done, closed, canceled, failed, partial, blocked }),
    nextSteps: nextStepsFor({ state: currentState, next, gateResult, gateIssues, nativeIssues, done, closed, canceled, failed, partial, blocked })
  };
}

function verdictFor({ state: currentState, next, gateResult, done, canceled, failed, partial, blocked, closed }) {
  if (done) return "SUCCESS";
  if (canceled) return "CANCELED";
  if (failed) return "FAILED";
  if (partial) return "PARTIAL";
  if (blocked) return "BLOCKED";
  if (closed) return "CLOSED";
  if (currentState?.status === "waiting_user") return "WAITING_USER";
  if (next?.action === "repair") return "NEEDS_REPAIR";
  if (next?.action === "wait") return "WAITING_AGENT";
  if (gateResult.status !== 0 && ["release", "done"].includes(currentState?.stage)) return "GATE_BLOCKED";
  return "IN_PROGRESS";
}

function explanationFor({ state: currentState, next, gateResult, gateIssues, nativeIssues, done, closed, canceled, failed, partial, blocked }) {
  if (done) return "This run is complete and archived. Do not start more agents for this run.";
  if (canceled) return "This run was canceled. Do not start more agents for this run; create a continuation run if the work should resume.";
  if (failed) return "This run is closed as failed. Do not start more agents for this run unless it is explicitly reopened.";
  if (partial && currentState?.archived) return "This run is archived as partial. Do not start more agents for this run; use a continuation run for follow-up work.";
  if (closed) return "This run is closed. Do not start more agents unless the run is explicitly reopened.";
  if (blocked) return "This run is blocked. Keep it open and route the next repair to the authorized owner agent unless the user explicitly closes it.";
  if (nativeIssues.length) return "Native subagent state has issues that must be fixed before reliable dispatch.";
  if (next?.action === "repair") return `tester/reviewer feedback requires owner repair: ${(next.repair?.targetAgents ?? []).join(", ") || "missing target"}.`;
  if (next?.action === "wait") return `A subagent is still active or waiting for closeout: ${(next.waitFor ?? []).join(", ") || "unknown"}.`;
  if (next?.action === "spawn" && next.next) return `The next authorized agent is ${next.next}. Start only this agent.`;
  if (gateResult.status !== 0) return `Quality gate is blocking closeout: ${gateIssues[0] ?? "see gate-check output"}.`;
  return "Run is open and no final success archive has been recorded yet.";
}

function nextStepsFor({ state: currentState, next, gateResult, nativeIssues, done, closed, canceled, failed, partial, blocked }) {
  if (done) return ["No action for this run. Use `npx crewup continue <run-id> \"...\"` for follow-up work."];
  if (canceled) return ["Do not start more agents for this run.", `Use \`npx crewup continue ${runId} \"...\"\` if the work should resume.`];
  if (failed) return ["Do not start more agents for this run.", "Review the archive summary, then create a continuation run if repair work should continue."];
  if (partial && currentState?.archived) return ["Do not start more agents for this run.", `Use \`npx crewup continue ${runId} \"...\"\` for follow-up implementation or repair.`];
  if (closed) return ["Do not start more agents for this run.", "Reopen only with an explicit repair command or create a continuation run."];
  if (blocked) return [`npx crewup native-state ${runId} diagnose`, `npx crewup native-state ${runId} reconcile-results`, `npx crewup next-agent ${runId}`];
  if (nativeIssues.length) return [`npx crewup native-state ${runId} diagnose`, `npx crewup native-state ${runId} reconcile-results`, `npx crewup next-agent ${runId}`];
  if (next?.action === "repair") return [`npx crewup repair-plan ${runId} --refresh`, `Route only these owner agents: ${(next.repair?.targetAgents ?? []).join(", ") || "(missing target)"}`];
  if (next?.action === "wait") return ["Wait for the active agent result, then capture it with native-state mark-result.", `npx crewup native-state ${runId} diagnose`];
  if (next?.action === "spawn" && next.next) return [`npx crewup next-agent ${runId}`, `Start only: ${next.next}`, `After it writes result files: npx crewup native-state ${runId} mark-result ${next.next} completed`];
  if (currentState?.status === "done" && !currentState.archived) return [`npx crewup archive ${runId} --outcome=success`];
  if (gateResult.status !== 0) return [`npx crewup gate-check ${runId}`, `npx crewup native-state ${runId} diagnose`];
  return [`npx crewup next-agent ${runId}`];
}

function printHealth(health) {
  console.log(`# CrewUp Run Health`);
  console.log("");
  console.log(`- Run: \`${health.runId}\``);
  console.log(`- Verdict: \`${health.verdict}\``);
  console.log(`- State: \`${health.status}\` / stage \`${health.stage}\` / outcome \`${health.outcome}\` / archived \`${health.archived ? "yes" : "no"}\``);
  console.log(`- Dispatch: \`${health.dispatch.action}\`${health.dispatch.next ? ` -> \`${health.dispatch.next}\`` : ""}`);
  if (health.dispatch.repairRequired) console.log(`- Repair targets: ${health.dispatch.repairTargets.join(", ") || "(missing)"}`);
  if (health.dispatch.waitFor.length) console.log(`- Wait for: ${health.dispatch.waitFor.join(", ")}`);
  console.log(`- Gate: ${health.gate.passed ? "passed" : "failed"}`);
  console.log("");
  console.log(`## What This Means`);
  console.log("");
  console.log(health.explanation);
  console.log("");
  if (health.gate.issues.length) {
    console.log("## Gate Issues");
    console.log("");
    for (const issue of health.gate.issues) console.log(`- ${issue}`);
    console.log("");
  }
  if (health.native.issues.length) {
    console.log("## Native State Issues");
    console.log("");
    for (const issue of health.native.issues) console.log(`- ${issue}`);
    console.log("");
  }
  console.log("## Next Steps");
  console.log("");
  for (const step of health.nextSteps) console.log(`- ${step}`);
  console.log("");
  console.log("## Paths");
  console.log("");
  console.log(`- Status card: ${health.paths.status}`);
  console.log(`- Run report: ${health.paths.report}`);
  if (existsSync(path.join(root, health.paths.summary))) console.log(`- Summary: ${health.paths.summary}`);
  if (existsSync(path.join(root, health.paths.repairPlan))) console.log(`- Repair plan: ${health.paths.repairPlan}`);
}

function runJson(script, scriptArgs) {
  const result = runText(script, scriptArgs);
  try {
    return JSON.parse(result.output);
  } catch {
    return null;
  }
}

function runText(script, scriptArgs) {
  const result = spawnSync(process.execPath, [resolveScriptPath(root, script), ...scriptArgs], {
    cwd: root,
    encoding: "utf8",
    env: process.env
  });
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
  };
}

async function readNativeState() {
  const target = path.join(runDir, "logs", "native-subagents", "native-state.json");
  if (!existsSync(target)) return null;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function extractBullets(output, afterHeading) {
  const lines = String(output ?? "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === afterHeading);
  const source = start >= 0 ? lines.slice(start + 1) : lines;
  const bullets = [];
  for (const line of source) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (bullets.length) break;
      continue;
    }
    if (/^[A-Z][A-Za-z ]+:$/.test(trimmed) && bullets.length) break;
    if (trimmed.startsWith("- ")) bullets.push(trimmed.slice(2));
  }
  return bullets;
}
