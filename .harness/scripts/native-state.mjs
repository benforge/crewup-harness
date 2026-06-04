import { open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { implementationPlanSkipReason, isImplementationAgentUnassigned } from "./lib/implementation-plan-scope.mjs";
import { writeOwnerAgentIds } from "./lib/agent-roles.mjs";
import { readRunState, writeRunState, writeRunStatus } from "./lib/run-lifecycle.mjs";

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

const releaseLock = await acquireNativeStateLock();
process.on("exit", () => {
  try {
    releaseLock.sync();
  } catch {
    // Best-effort cleanup; stale locks are recovered on the next command.
  }
});

const state = JSON.parse(stripBom(await readFile(statePath, "utf8")));

switch (command) {
  case "status":
    printStatus(state);
    break;
  case "diagnose":
    await printDiagnostics(state);
    break;
  case "recommend-close":
    printStatus(state, { includeRecommendations: false });
    printCloseRecommendations(state, { force: true });
    break;
  case "mark-spawned":
    requireAgentAndValue("handle");
    validateHandle(value);
    enforceSpawnPrerequisites(agentId);
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
        console.error(`Ask the subagent to write its own result file first, then rerun mark-result.`);
        process.exit(1);
      }
      const resultJsonPath = agent.result_json_path ?? resultPath.replace(/\.result\.md$/, ".result.json");
      const parsedJson = await readResultJson(resultJsonPath);
      if (existsSync(resolveWorkspacePath(resultJsonPath)) && parsedJson.status && parsedJson.status !== value) {
        console.error(`Cannot capture result for ${agentId}: JSON status (${parsedJson.status}) does not match mark-result status (${value}).`);
        process.exit(1);
      }
      enforceRequirementsPlanConfirmation({ status: value, resultJsonPath, parsedJson });
      if (
        agent.result_captured_at
        && agent.result_status === value
        && normalizePath(agent.result_path) === normalizePath(resultPath)
        && normalizePath(agent.result_json_path) === normalizePath(resultJsonPath)
      ) {
        console.log(`Result already captured for ${agentId}; no native-state changes needed.`);
        process.exit(0);
      }
      const retainedCompleted = value === "completed" && agent.retention?.retain_after_result;
      const nextStatus = retainedCompleted
        ? agent.retention.retained_status_after_completed_result ?? "waiting_review"
        : value;
      updateAgent(agentId, {
        status: nextStatus,
        result_status: value,
        result_path: resultPath,
        result_json_path: resultJsonPath,
        result_captured_at: new Date().toISOString(),
        last_error: null
      });
    }
    await save(state);
    await syncRunLifecycleFromNativeResult(agentId, value);
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

function enforceRequirementsPlanConfirmation({ status, resultJsonPath, parsedJson }) {
  if (agentId !== "requirements-plan") return;
  const jsonExists = resultJsonPath && existsSync(resolveWorkspacePath(resultJsonPath));
  if (!jsonExists) {
    console.error("Cannot capture requirements-plan result: result JSON is required for clarification gating.");
    console.error(`Expected: ${resultJsonPath}`);
    process.exit(1);
  }

  if (status === "needs_input") {
    const questions = Array.isArray(parsedJson.clarificationQuestions) ? parsedJson.clarificationQuestions : [];
    if (questions.length === 0) {
      console.error("Cannot capture requirements-plan needs_input: clarificationQuestions must contain at least one user-facing question.");
      console.error("The requirements-plan agent must ask the user instead of self-answering.");
      process.exit(1);
    }
    if (questions.length > 3) {
      console.error("Cannot capture requirements-plan needs_input: ask at most 3 clarification questions per round.");
      console.error("Split large questionnaires into multiple short rounds so Codex can use native choice UI when available.");
      process.exit(1);
    }
    const oversized = questions.find((question) => Array.isArray(question.options) && question.options.length > 3);
    if (oversized) {
      console.error(`Cannot capture requirements-plan needs_input: ${oversized.id ?? "a question"} has more than 3 options.`);
      console.error("Keep each clarification question concise enough for native choice UI, or move details into requirement-plan.md.");
      process.exit(1);
    }
    return;
  }

  if (status === "completed" && parsedJson.userConfirmed !== true) {
    console.error("Cannot complete requirements-plan before user confirmation.");
    console.error("Ask the user to answer or accept the clarification questions, then resume requirements-plan.");
    console.error("The resumed result JSON must set userConfirmed: true and record confirmationSource.");
    process.exit(1);
  }
}

function printStatus(current, { includeRecommendations = true } = {}) {
  console.log(`Native state: ${runId}`);
  if (current.fallback) console.log(`Fallback: ${current.fallback.reason}`);
  const retained = (current.agents ?? []).filter((agent) => agent.status === "waiting_review" && agent.retention?.retain_after_result);
  if (retained.length > 0) {
    const retainedImpl = retained.filter((agent) => writeOwnerAgentIds.has(agent.agent)).length;
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

function enforceSpawnPrerequisites(targetAgentId) {
  if (isImplementationAgentUnassigned(targetAgentId, { root, runId })) {
    console.error(`Cannot spawn ${targetAgentId}: ${implementationPlanSkipReason(targetAgentId)}.`);
    console.error("The architect-owned implementation plan decides which implementation agents are actually needed.");
    process.exit(1);
  }

  const agent = findAgent(targetAgentId);
  const prerequisites = agent.requires_completed_agents ?? [];
  if (!prerequisites.length) return;

  const byAgent = new Map((state.agents ?? []).map((item) => [item.agent, item]));
  const missing = [];
  for (const prerequisite of prerequisites) {
    if (isImplementationAgentUnassigned(prerequisite, { root, runId })) continue;
    const item = byAgent.get(prerequisite);
    if (!item?.handle || !item?.result_captured_at || item?.result_status !== "completed") {
      missing.push(prerequisite);
    }
  }

  if (missing.length === 0) return;
  console.error(`Cannot spawn ${targetAgentId}: prerequisite agent results are not completed and captured.`);
  console.error(`Missing prerequisites: ${missing.join(", ")}`);
  console.error("Follow the harness order and capture upstream results with native-state mark-result before spawning this agent.");
  process.exit(1);
}

async function printDiagnostics(current) {
  console.log(`Native diagnostics: ${runId}`);
  if (current.fallback) console.log(`Fallback: ${current.fallback.reason}`);
  const issues = [];
  const suggestions = [];
  for (const agent of current.agents ?? []) {
    const resultPathExists = agent.result_path && existsSync(resolveWorkspacePath(agent.result_path));
    const resultJsonPathExists = agent.result_json_path && existsSync(resolveWorkspacePath(agent.result_json_path));
    const parsedJson = resultJsonPathExists ? await tryReadResultJson(agent.result_json_path) : { ok: true, value: null };

    if (resultJsonPathExists && !parsedJson.ok) {
      issues.push(`${agent.agent}: invalid result JSON at ${agent.result_json_path}: ${parsedJson.error}`);
      suggestions.push(`${agent.agent}: ask the same subagent to rewrite valid JSON result, then rerun mark-result.`);
    }
    if (!agent.handle && (resultPathExists || resultJsonPathExists)) {
      issues.push(`${agent.agent}: result file exists but native handle is missing.`);
      suggestions.push(`${agent.agent}: rerun or resume the real subagent and record mark-spawned with the real handle; do not fabricate a handle.`);
    }
    if (agent.handle && !agent.result_captured_at && (resultPathExists || resultJsonPathExists)) {
      issues.push(`${agent.agent}: result files exist but result is not captured in native-state.`);
      suggestions.push(`${agent.agent}: run native-state mark-result ${agent.agent} <completed|blocked|needs_input>.`);
    }
    if (agent.result_captured_at && !resultPathExists) {
      issues.push(`${agent.agent}: native-state captured result but Markdown result file is missing.`);
      suggestions.push(`${agent.agent}: ask the subagent to recreate ${agent.result_path}, then rerun gate-check.`);
    }
    if (parsedJson.value?.agent && parsedJson.value.agent !== agent.agent) {
      issues.push(`${agent.agent}: result JSON declares agent ${parsedJson.value.agent}.`);
      suggestions.push(`${agent.agent}: correct the result JSON agent field through the owning subagent or explicit repair.`);
    }
    if (parsedJson.value?.status && !["completed", "blocked", "needs_input"].includes(parsedJson.value.status)) {
      issues.push(`${agent.agent}: result JSON has invalid status ${parsedJson.value.status}.`);
      suggestions.push(`${agent.agent}: rewrite status as completed, blocked, or needs_input.`);
    }
  }

  if (issues.length === 0) {
    console.log("Issues: none");
  } else {
    console.log("Issues:");
    for (const issue of issues) console.log(`- ${issue}`);
  }

  const uniqueSuggestions = [...new Set(suggestions)];
  if (uniqueSuggestions.length > 0) {
    console.log("Suggested actions:");
    for (const suggestion of uniqueSuggestions) console.log(`- ${suggestion}`);
  }
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

  const isImplementation = (agent) => writeOwnerAgentIds.has(agent.agent);
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
    "docs",
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

function validateHandle(handle) {
  if (String(handle ?? "").startsWith("--")) {
    console.error(`Invalid native handle for ${agentId}: ${handle}`);
    console.error(`Use: npm run harness:native-state -- ${runId} mark-spawned ${agentId} <handle>`);
    console.error("Do not pass --handle=<id>; pass the raw native agent id/handle as the final argument.");
    process.exit(1);
  }
}

async function readResultJson(target) {
  const absolute = resolveWorkspacePath(target);
  if (!existsSync(absolute)) return {};
  try {
    const parsed = JSON.parse(stripBom(await readFile(absolute, "utf8")));
    if (parsed.agent && parsed.agent !== agentId) {
      console.error(`Cannot capture result for ${agentId}: JSON agent is ${parsed.agent}.`);
      process.exit(1);
    }
    if (parsed.status) validateResultStatus(parsed.status);
    return parsed;
  } catch (error) {
    console.error(`Cannot parse result JSON for ${agentId}: ${target}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function tryReadResultJson(target) {
  const absolute = resolveWorkspacePath(target);
  if (!existsSync(absolute)) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(stripBom(await readFile(absolute, "utf8"))) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function resolveWorkspacePath(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

function normalizePath(target) {
  return String(target ?? "").replaceAll("\\", "/");
}

function stripBom(text) {
  return String(text ?? "").replace(/^\uFEFF/, "");
}

async function acquireNativeStateLock() {
  const lockPath = `${statePath}.lock`;
  const startedAt = Date.now();
  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`, "utf8");
      await handle.close();
      return {
        async release() {
          await unlink(lockPath).catch(() => {});
        },
        sync() {
          if (existsSync(lockPath)) unlinkSync(lockPath);
        }
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      await removeStaleLock(lockPath);
      if (Date.now() - startedAt > 30000) {
        console.error(`Timed out waiting for native-state lock: ${path.relative(root, lockPath)}`);
        process.exit(1);
      }
      await sleep(100);
    }
  }
}

async function removeStaleLock(lockPath) {
  try {
    const lockStat = await stat(lockPath);
    if (Date.now() - lockStat.mtimeMs > 30000) await unlink(lockPath).catch(() => {});
  } catch {
    // Missing or unreadable lock; the next acquire attempt will decide.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function save(current) {
  current.updatedAt = new Date().toISOString();
  await writeFile(statePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  await releaseLock.release();
  printStatus(current);
}

async function syncRunLifecycleFromNativeResult(currentAgentId, resultStatus) {
  const runState = await readRunState(root, runId);
  if (!runState) return;
  if (resultStatus === "needs_input") {
    await writeRunState(root, runId, {
      ...runState,
      status: "waiting_user",
      health: { level: "ok", reason: "" },
      nextAction: {
        type: "user",
        description: `${currentAgentId} needs user input.`,
        command: currentAgentId === "requirements-plan" ? `npx crewup clarify ${runId} --interactive` : ""
      }
    });
    return;
  }
  if (runState.status === "waiting_user" && resultStatus === "completed") {
    await writeRunState(root, runId, {
      ...runState,
      status: "active",
      nextAction: {
        type: "agent",
        description: "Run the next allowed CrewUp agent or transition gate.",
        command: `npx crewup next-agent ${runId}`
      }
    });
    return;
  }
  await writeRunStatus(root, runId, runState);
}

function usage() {
  console.error("Usage:");
  console.error("  npm run harness:native-state -- <run-id> status");
  console.error("  npm run harness:native-state -- <run-id> diagnose");
  console.error("  npm run harness:native-state -- <run-id> recommend-close");
  console.error("  npm run harness:native-state -- <run-id> mark-spawned <agent> <handle>");
  console.error("  npm run harness:native-state -- <run-id> mark-result <agent> <completed|blocked|needs_input> [result-path]");
  console.error("  npm run harness:native-state -- <run-id> mark-ready-to-close <agent>");
  console.error("  npm run harness:native-state -- <run-id> mark-resumed <agent>");
  console.error("  npm run harness:native-state -- <run-id> mark-closed <agent>");
  console.error("  npm run harness:native-state -- <run-id> mark-error <agent> <message>");
  console.error("  npm run harness:native-state -- <run-id> mark-fallback <reason>");
}
