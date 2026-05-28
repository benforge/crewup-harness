import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const [runId, command, agentId, value, ...rest] = process.argv.slice(2);

if (!runId || !command) {
  usage();
  process.exit(1);
}

const statePath = path.join(root, ".harness", "runs", runId, "logs", "native-subagents", "native-state.json");
if (!existsSync(statePath)) {
  console.error(`Missing native state: ${path.relative(root, statePath)}`);
  console.error(`Run first: npm run harness:native-plan -- ${runId} --agents=<agents>`);
  process.exit(1);
}

const state = JSON.parse(await readFile(statePath, "utf8"));

switch (command) {
  case "status":
    printStatus(state);
    break;
  case "recommend-close":
    printStatus(state, { includeRecommendations: false });
    printCloseRecommendations(state, { force: true });
    break;
  case "mark-spawned":
    requireAgentAndValue("handle");
    updateAgent(agentId, {
      status: "running",
      handle: value,
      spawned_at: new Date().toISOString(),
      result_captured_at: null,
      closed_at: null,
      close_confirmed: false,
      result_status: null,
      ready_to_close_at: null,
      resumed_at: null,
      last_error: null
    });
    await save(state);
    break;
  case "mark-result":
    requireAgentAndValue("status");
    validateResultStatus(value);
    {
      const agent = findAgent(agentId);
      if (!agent.handle) {
        console.error(`Cannot capture result for ${agentId}: native handle is missing.`);
        console.error(`Run first: npm run harness:native-state -- ${runId} mark-spawned ${agentId} <handle>`);
        console.error("Fallback or hand-written summaries do not count as real native subagent execution.");
        process.exit(1);
      }
      const resultPath = rest[0] ?? agent.result_path;
      if (!resultPath || !existsSync(resolveWorkspacePath(resultPath))) {
        console.error(`Cannot capture result for ${agentId}: result file is missing.`);
        console.error(`Expected: ${resultPath || "(none)"}`);
        console.error(`Write or summarize the subagent final message first, then rerun mark-result.`);
        process.exit(1);
      }
      const retainedCompleted = value === "completed" && agent.retention?.retain_after_result;
      const nextStatus = retainedCompleted
        ? agent.retention.retained_status_after_completed_result ?? "waiting_review"
        : value;
      updateAgent(agentId, {
        status: nextStatus,
        result_status: value,
        result_path: resultPath,
        result_captured_at: new Date().toISOString(),
        last_error: null
      });
    }
    await save(state);
    break;
  case "mark-ready-to-close":
    requireAgent(agentId);
    updateAgent(agentId, {
      status: "ready_to_close",
      ready_to_close_at: new Date().toISOString(),
      last_error: null
    });
    await save(state);
    break;
  case "mark-resumed":
    requireAgent(agentId);
    updateAgent(agentId, {
      status: "running",
      resumed_at: new Date().toISOString(),
      last_error: null
    });
    await save(state);
    break;
  case "mark-closed":
    requireAgent(agentId);
    updateAgent(agentId, {
      status: "closed",
      closed_at: new Date().toISOString(),
      close_confirmed: true,
      last_error: null
    });
    await save(state);
    break;
  case "mark-error":
    requireAgentAndValue("message");
    updateAgent(agentId, {
      status: "error",
      last_error: [value, ...rest].join(" "),
      updated_at: new Date().toISOString()
    });
    await save(state);
    break;
  case "mark-fallback":
    state.fallback = {
      reason: [agentId, value, ...rest].filter(Boolean).join(" "),
      recorded_at: new Date().toISOString()
    };
    await save(state);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}

function printStatus(current, { includeRecommendations = true } = {}) {
  console.log(`Native state: ${runId}`);
  if (current.fallback) console.log(`Fallback: ${current.fallback.reason}`);
  const retained = (current.agents ?? []).filter((agent) => agent.status === "waiting_review" && agent.retention?.retain_after_result);
  if (retained.length > 0) {
    const retainedImpl = retained.filter((agent) => ["frontend", "backend", "database", "devops", "tester"].includes(agent.agent)).length;
    console.log(`Retained: ${retained.length} total, ${retainedImpl} implementation, ${retained.length - retainedImpl} non-implementation`);
  }
  for (const agent of current.agents ?? []) {
    const close = agent.close_required ? `close=${agent.close_confirmed ? "yes" : "no"}` : "close=n/a";
    const retained = agent.retention?.retain_after_result ? "retained=yes" : "retained=no";
    const result = agent.result_status ? `result=${agent.result_status}` : `result=${agent.result_captured_at ? "yes" : "no"}`;
    console.log(`- ${agent.agent}: ${agent.status}, handle=${agent.handle ?? "none"}, ${result}, ${retained}, ${close}`);
  }
  if (includeRecommendations) printCloseRecommendations(current);
}

function printCloseRecommendations(current, { force = false } = {}) {
  const recommendations = recommendClose(current);
  if (!recommendations.length && force) {
    console.log("Close recommendations: none. Retained subagent capacity is healthy.");
    return;
  }
  if (!recommendations.length) return;
  console.log("Close recommendations:");
  for (const item of recommendations) {
    console.log(`- ${item.agent}: ${item.reason}`);
  }
  console.log("Use mark-ready-to-close, then close_agent, then mark-closed for each released agent.");
}

function recommendClose(current) {
  const capacity = current.retention_capacity ?? {};
  const maxTotal = Number(capacity.max_retained_subagents ?? 4);
  const maxImpl = Number(capacity.max_retained_implementation_agents ?? 2);
  const maxNonImpl = Number(capacity.max_retained_non_implementation_agents ?? 2);
  const retained = (current.agents ?? []).filter((agent) => {
    if (agent.status !== "waiting_review") return false;
    if (agent.close_confirmed || agent.status === "closed") return false;
    return agent.retention?.retain_after_result;
  });

  const implementationAgents = new Set(["frontend", "backend", "database", "devops", "tester"]);
  const isImplementation = (agent) => implementationAgents.has(agent.agent);
  const priority = capacity.close_recommendation_priority ?? [
    "release",
    "reviewer",
    "pm",
    "requirements-plan",
    "requirements",
    "architect",
    "tester",
    "devops",
    "database",
    "backend",
    "frontend"
  ];
  const priorityIndex = new Map(priority.map((agent, index) => [agent, index]));
  const sorted = [...retained].sort((left, right) => {
    const rank = (priorityIndex.get(left.agent) ?? 999) - (priorityIndex.get(right.agent) ?? 999);
    if (rank !== 0) return rank;
    return String(left.result_captured_at ?? "").localeCompare(String(right.result_captured_at ?? ""));
  });

  let total = retained.length;
  let impl = retained.filter(isImplementation).length;
  let nonImpl = total - impl;
  const recommendations = [];
  for (const agent of sorted) {
    const agentIsImpl = isImplementation(agent);
    const exceedsTotal = total > maxTotal;
    const exceedsGroup = agentIsImpl ? impl > maxImpl : nonImpl > maxNonImpl;
    if (!exceedsTotal && !exceedsGroup) continue;
    const reasonParts = [];
    if (exceedsTotal) reasonParts.push(`retained total ${total}/${maxTotal}`);
    if (exceedsGroup) reasonParts.push(agentIsImpl ? `implementation retained ${impl}/${maxImpl}` : `non-implementation retained ${nonImpl}/${maxNonImpl}`);
    recommendations.push({ agent: agent.agent, reason: reasonParts.join(", ") });
    total -= 1;
    if (agentIsImpl) impl -= 1;
    else nonImpl -= 1;
  }
  return recommendations;
}

function updateAgent(id, patch) {
  const agent = findAgent(id);
  Object.assign(agent, patch, { updated_at: new Date().toISOString() });
}

function findAgent(id) {
  requireAgent(id);
  const agent = (state.agents ?? []).find((item) => item.agent === id);
  if (!agent) {
    console.error(`Agent not found in native state: ${id}`);
    process.exit(1);
  }
  return agent;
}

function requireAgent(id) {
  if (!id) {
    console.error(`Missing agent id for ${command}`);
    usage();
    process.exit(1);
  }
}

function requireAgentAndValue(label) {
  requireAgent(agentId);
  if (!value) {
    console.error(`Missing ${label} for ${command}`);
    usage();
    process.exit(1);
  }
}

function validateResultStatus(status) {
  if (!["completed", "blocked", "needs_input"].includes(status)) {
    console.error(`Invalid result status: ${status}`);
    console.error("Expected one of: completed, blocked, needs_input");
    process.exit(1);
  }
}

function resolveWorkspacePath(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

async function save(current) {
  current.updatedAt = new Date().toISOString();
  await writeFile(statePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  printStatus(current);
}

function usage() {
  console.error("Usage:");
  console.error("  npm run harness:native-state -- <run-id> status");
  console.error("  npm run harness:native-state -- <run-id> recommend-close");
  console.error("  npm run harness:native-state -- <run-id> mark-spawned <agent> <handle>");
  console.error("  npm run harness:native-state -- <run-id> mark-result <agent> <completed|blocked|needs_input> [result-path]");
  console.error("  npm run harness:native-state -- <run-id> mark-ready-to-close <agent>");
  console.error("  npm run harness:native-state -- <run-id> mark-resumed <agent>");
  console.error("  npm run harness:native-state -- <run-id> mark-closed <agent>");
  console.error("  npm run harness:native-state -- <run-id> mark-error <agent> <message>");
  console.error("  npm run harness:native-state -- <run-id> mark-fallback <reason>");
}
