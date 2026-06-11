import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";
import { readRunState } from "./lib/run-lifecycle.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const until = valueOf("--until=") ?? "blocked";
const json = args.includes("--json");

if (!runId) {
  console.error("Usage: npx crewup drive <run-id> [--until=done|blocked] [--json]");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const events = [];
const state = await readRunState(root, runId).catch(() => null);
if (state?.workflowProfile === "lite-v2") {
  const result = runScript("finish.mjs", [runId], { allowFailure: true });
  emit({
    runId,
    mode: "lite",
    action: result.status === 0 ? "finished" : "needs_lite_evidence",
    command: result.status === 0 ? "" : `npx crewup finish ${runId}`,
    events
  }, result.status === 0 ? 0 : 1);
}

runScript("native-state.mjs", [runId, "reconcile-results"], { allowFailure: true });
events.push("reconcile-results attempted");

const next = runJson("next-agent.mjs", [runId, "--json"]);
events.push(`next-agent action=${next.action}`);

if (next.action === "repair") {
  const repair = runScript("repair-plan.mjs", [runId, "--refresh"], { allowFailure: true });
  emit({
    runId,
    action: "repair",
    repairRequired: true,
    targetAgents: next.repair?.targetAgents ?? [],
    command: repair.status === 0 ? `resume owner repair agents: ${(next.repair?.targetAgents ?? []).join(", ") || "(missing)"}` : `npx crewup repair-plan ${runId}`,
    events
  }, repair.status === 0 ? 0 : 1);
}

if (next.action === "spawn") {
  emit({
    runId,
    action: "spawn",
    next: next.next,
    command: `start native subagent ${next.next} using its generated spawn prompt`,
    do: `Start only ${next.next}.`,
    dont: "Do not start downstream agents or manually write owner artifacts.",
    why: "next-agent says this is the only runnable owner.",
    prompt: next.runnable?.[0]?.prompt_path ?? "",
    events
  });
}

if (next.action === "wait") {
  emit({
    runId,
    action: "wait",
    waitFor: next.waitFor ?? [],
    command: `wait for active native result: ${(next.waitFor ?? []).join(", ")}`,
    do: `Wait for active result: ${(next.waitFor ?? []).join(", ")}.`,
    dont: "Do not restart the active agent while recent progress exists.",
    why: "The run has active work and no safer downstream action yet.",
    events
  });
}

if (next.action === "stale") {
  emit({
    runId,
    action: "stale",
    stale: next.stale ?? [],
    command: `ask same subagent for one result-only closeout, then run: npx crewup native-state ${runId} diagnose`,
    do: "Ask the same subagent once for result-only closeout, then diagnose/reconcile.",
    dont: "Do not loop forever and do not start a replacement agent before diagnosis.",
    why: "No result and no recent progress were detected.",
    events
  }, until === "done" ? 1 : 0);
}

if (next.action === "blocked") {
  emit({
    runId,
    action: "blocked",
    blocked: next.blocked ?? [],
    command: `npx crewup explain ${runId}`,
    do: "Run explain and native-state diagnostics before changing state.",
    dont: "Do not force finish or bypass owner gates.",
    why: "Prerequisites or state evidence are missing.",
    events
  }, until === "done" ? 1 : 0);
}

if (["idle", "done", "closed"].includes(next.action)) {
  await closeout();
}

emit({
  runId,
  action: next.action ?? "unknown",
  command: next.instruction ?? `npx crewup explain ${runId}`,
  events
});

async function closeout() {
  const current = await readRunState(root, runId).catch(() => null);
  const stage = current?.stage ?? "";
  if (!["release", "done"].includes(stage)) {
    emit({
      runId,
      action: "not_ready_for_closeout",
      stage,
      command: `npx crewup next-agent ${runId}`,
      events
    }, until === "done" ? 1 : 0);
  }

  for (const script of ["orchestration-audit.mjs", "gate-check.mjs", "report.mjs"]) {
    const result = runScript(script, [runId], { allowFailure: true });
    events.push(`${script}: ${result.status === 0 ? "ok" : "failed"}`);
    if (result.status !== 0) {
      emit({
        runId,
        action: "closeout_blocked",
        failedStep: script.replace(/\.mjs$/, ""),
        command: script === "gate-check.mjs" ? `npx crewup gate-check ${runId}` : `npx crewup ${script.replace(/\.mjs$/, "")} ${runId}`,
        events
      }, until === "done" ? 1 : 0);
    }
  }

  const finish = runScript("finish.mjs", [runId], { allowFailure: true });
  events.push(`finish: ${finish.status === 0 ? "ok" : "failed"}`);
  emit({
    runId,
    action: finish.status === 0 ? "finished" : "finish_blocked",
    command: finish.status === 0 ? "" : `npx crewup finish ${runId}`,
    events
  }, finish.status === 0 ? 0 : 1);
}

function runJson(script, scriptArgs) {
  const result = runScript(script, scriptArgs, { allowFailure: false });
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error(`Cannot parse JSON from ${script}: ${error.message}`);
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    process.exit(1);
  }
}

function runScript(script, scriptArgs, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [resolveScriptPath(root, script), ...scriptArgs], {
    cwd: root,
    encoding: "utf8",
    env: process.env
  });
  if (!allowFailure && result.status !== 0) {
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    process.exit(result.status ?? 1);
  }
  return result;
}

function emit(payload, status = 0) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`CrewUp drive: ${payload.runId}`);
    console.log(`- action: ${payload.action}`);
    if (payload.next) console.log(`- next: ${payload.next}`);
    if (payload.stage) console.log(`- stage: ${payload.stage}`);
    if (payload.command) console.log(`- command: ${payload.command}`);
    if (payload.do) console.log(`- do: ${payload.do}`);
    if (payload.dont) console.log(`- don't: ${payload.dont}`);
    if (payload.why) console.log(`- why: ${payload.why}`);
    if (payload.prompt) console.log(`- prompt: ${payload.prompt}`);
    if (payload.events?.length) {
      console.log("- events:");
      for (const event of payload.events) console.log(`  - ${event}`);
    }
  }
  process.exit(status);
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
