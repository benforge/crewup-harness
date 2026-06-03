import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  artifactHasOwnerProvenance,
  collectArtifactProvenance,
  describeArtifactProvenance
} from "./lib/artifact-provenance.mjs";
import { sortByExecutionOrder } from "./lib/execution-order.mjs";
import { implementationAgentIds } from "./lib/implementation-plan-scope.mjs";
import { isImplementationAgentUnassigned, implementationPlanSkipReason } from "./lib/implementation-plan-scope.mjs";
import {
  collectWorkspaceChanges,
  configureDelegationGuard,
  evaluateDelegationGuard,
  readChangedFilesManifest,
  readNativeState
} from "./lib/delegation-guard.mjs";
import { loadProjectProfile } from "./lib/project-profile.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const json = args.includes("--json");
const strictWarnings = args.includes("--strict-warnings");

if (!runId) {
  console.error("Please provide runId, for example: npx crewup audit <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs");
const nativeDir = path.join(logsDir, "native-subagents");

const findings = [];
let state = {};

if (!existsSync(runDir)) {
  add("error", "run_missing", `Run does not exist: ${runId}`);
  await finish();
}

state = await readJson(path.join(runDir, "state.json"), {});
const nativeState = await readNativeState(root, runId);
const taskAgents = await listTaskAgents();
const schema = await readArtifactSchema();
const artifactProvenance = await collectArtifactProvenance(root, runId);
const { project_profile: projectProfile } = await loadProjectProfile(root);
configureDelegationGuard(projectProfile);

await checkNativeState();
await checkNextRunnableShape();
await checkOwnerArtifacts();
await checkDelegation();
await checkFeedbackRepairLoop();
await checkContextPressure();
await checkRetainedAgents();

await finish();

async function checkNativeState() {
  if (!nativeState) {
    add("warning", "native_state_missing", "No native-state.json found. This is only acceptable before native/bridge subagents are planned.");
    return;
  }

  const agents = nativeState.agents ?? [];
  const byAgent = new Map(agents.map((agent) => [agent.agent, agent]));
  const seen = new Set();

  for (const agent of agents) {
    if (seen.has(agent.agent)) add("error", "duplicate_native_agent", `Duplicate native agent entry: ${agent.agent}`);
    seen.add(agent.agent);

    if (agent.status && ["completed", "blocked", "needs_input", "waiting_review", "ready_to_close", "closed"].includes(agent.status) && !agent.handle) {
      add("error", "terminal_without_handle", `${agent.agent} has terminal/review status without a real native handle.`);
    }

    if (agent.result_captured_at && (!agent.result_path || !existsSync(resolveWorkspacePath(agent.result_path)))) {
      add("error", "captured_result_missing_file", `${agent.agent} result is captured but result file is missing: ${agent.result_path ?? "(none)"}`);
    }

    if (implementationAgentIds.has(agent.agent) && isImplementationAgentUnassigned(agent.agent, { root, runId }) && (agent.handle || agent.result_captured_at)) {
      add("error", "unassigned_implementation_started", `${agent.agent} was started or captured even though ${implementationPlanSkipReason(agent.agent)}.`);
    }

    for (const prerequisite of agent.requires_completed_agents ?? []) {
      if (implementationAgentIds.has(prerequisite) && isImplementationAgentUnassigned(prerequisite, { root, runId })) continue;
      const upstream = byAgent.get(prerequisite);
      if (!hasCompletedNativeResult(upstream) && (agent.handle || agent.result_captured_at)) {
        add("error", "downstream_started_before_prerequisite", `${agent.agent} has started/captured before prerequisite ${prerequisite} completed.`);
      }
      if (upstream?.result_captured_at && agent.spawned_at && Date.parse(agent.spawned_at) < Date.parse(upstream.result_captured_at)) {
        add("error", "spawn_timestamp_before_prerequisite", `${agent.agent} spawned before ${prerequisite} result was captured.`);
      }
    }
  }
}

async function checkNextRunnableShape() {
  if (!nativeState) return;
  const agents = nativeState.agents ?? [];
  const byAgent = new Map(agents.map((agent) => [agent.agent, agent]));
  const runnable = [];
  const active = [];

  for (const agentId of sortByExecutionOrder(agents.map((agent) => agent.agent))) {
    const agent = byAgent.get(agentId);
    if (!agent || hasCompletedNativeResult(agent)) continue;
    if (isImplementationAgentUnassigned(agent.agent, { root, runId })) continue;
    if (["running", "waiting_review", "ready_to_close"].includes(agent.status)) {
      active.push(agent.agent);
      continue;
    }
    const missing = (agent.requires_completed_agents ?? []).filter((prerequisite) => {
      if (implementationAgentIds.has(prerequisite) && isImplementationAgentUnassigned(prerequisite, { root, runId })) return false;
      return !hasCompletedNativeResult(byAgent.get(prerequisite));
    });
    if (missing.length === 0) runnable.push(agent.agent);
  }

  if (runnable.length > 1) {
    add("warning", "multiple_runnable_agents", `Multiple agents are runnable now: ${runnable.join(", ")}. Start only the first listed by next-agent unless the workflow explicitly allows parallel execution.`);
  }
  if (active.length > 3) {
    add("warning", "many_active_agents", `Many native agents are active or retained: ${active.join(", ")}. Close completed retained agents to keep the main window calm.`);
  }
}

async function checkOwnerArtifacts() {
  for (const [file, rules] of Object.entries(schema.artifacts ?? {})) {
    if (!rules.owner) continue;
    const target = path.join(artifactsDir, file);
    if (!existsSync(target)) continue;

    const owner = nativeState?.agents?.find((agent) => agent.agent === rules.owner);
    const ownerDone = hasCompletedNativeResult(owner);
    const hasProvenance = artifactHasOwnerProvenance(artifactProvenance, file, rules.owner);

    if (nativeState && !ownerDone) {
      add("error", "owner_artifact_before_owner_done", `${file} exists before owner agent ${rules.owner} completed. The main agent must not author owner artifacts.`);
      continue;
    }

    if (nativeState && !hasProvenance) {
      add("error", "owner_artifact_missing_provenance", `${file} is missing artifactUpdates provenance from ${rules.owner}. Found: ${describeArtifactProvenance(artifactProvenance, file)}.`);
    }
  }
}

async function checkDelegation() {
  const workspaceFiles = collectWorkspaceChanges(root, runId, state);
  const manifestFiles = readChangedFilesManifest(root, runId);
  const issues = evaluateDelegationGuard({
    root,
    runId,
    state,
    workspaceFiles,
    manifestFiles,
    nativeState,
    targetStage: state.stage
  });
  for (const issue of issues) add("error", "delegation_guard", issue);
}

async function checkFeedbackRepairLoop() {
  for (const agentId of ["tester", "reviewer"]) {
    const result = await readAgentResultJson(agentId);
    if (!result) continue;
    const requiredFixes = result.requiredFixes ?? [];
    const blockingIssues = result.blockingIssues ?? [];
    if (result.fixRequired === true || requiredFixes.length > 0 || blockingIssues.length > 0) {
      const targets = [
        ...new Set([
          ...asArray(result.targetAgents),
          ...requiredFixes.flatMap((fix) => asArray(fix.targetAgents))
        ])
      ];
      const repairTasks = await listRepairTaskAgents();
      const missingRepairTasks = targets.filter((agent) => !repairTasks.has(agent));
      if (missingRepairTasks.length > 0) {
        add("error", "feedback_not_delegated", `${agentId} requires delegated repair, but repair tasks are missing for: ${missingRepairTasks.join(", ")}.`);
      } else {
        add("warning", "feedback_repair_pending", `${agentId} requires delegated repair. Repair tasks exist for: ${targets.join(", ") || "(unspecified)"}.`);
      }
    }
  }
}

async function checkContextPressure() {
  const budget = await readJson(path.join(logsDir, "context", "context-budget.json"), null);
  if (budget?.agents?.length) {
    const total = budget.agents.reduce((sum, item) => sum + Number(item.estimatedTokens ?? 0), 0);
    if (total > 60000) add("warning", "context_budget_high", `Context budget is high: ${total} estimated tokens across agent packs.`);
    for (const item of budget.agents) {
      if (Number(item.estimatedTokens ?? 0) > 20000) {
        add("warning", "agent_context_high", `${item.agent} context pack is high: ${item.estimatedTokens} estimated tokens.`);
      }
    }
  }

  const ledger = await readJson(path.join(logsDir, "token-ledger.json"), null);
  const estimated = Number(ledger?.estimate?.estimatedTokens ?? 0);
  if (estimated > 100000) add("warning", "token_ledger_high", `Run token ledger is high: ${estimated} estimated tokens.`);
}

async function checkRetainedAgents() {
  if (!nativeState) return;
  const capacity = nativeState.retention_capacity ?? {};
  const maxRetained = Number(capacity.max_retained_subagents ?? 4);
  const retained = (nativeState.agents ?? []).filter((agent) => agent.status === "waiting_review" && agent.retention?.retain_after_result && !agent.close_confirmed);
  if (retained.length > maxRetained) {
    add("warning", "retained_agent_capacity", `Retained native agents exceed capacity: ${retained.length}/${maxRetained}. Run native-state recommend-close and close unneeded agents.`);
  }
}

async function readArtifactSchema() {
  const target = path.join(root, ".harness", "config", "artifact-schema.yaml");
  if (!existsSync(target)) return { artifacts: {} };
  return parseYaml(await readFile(target, "utf8")) ?? { artifacts: {} };
}

async function readAgentResultJson(agentId) {
  const target = path.join(nativeDir, `${agentId}.result.json`);
  return readJson(target, null);
}

async function listTaskAgents() {
  if (!existsSync(tasksDir)) return new Set();
  const entries = await readdir(tasksDir, { withFileTypes: true }).catch(() => []);
  return new Set(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".task.md")).map((entry) => entry.name.replace(/\.task\.md$/, "")));
}

async function listRepairTaskAgents() {
  const repairsDir = path.join(tasksDir, "repairs");
  if (!existsSync(repairsDir)) return new Set();
  const entries = await readdir(repairsDir, { withFileTypes: true }).catch(() => []);
  return new Set(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".repair.task.md")).map((entry) => entry.name.replace(/\.repair\.task\.md$/, "")));
}

function hasCompletedNativeResult(agent) {
  return Boolean(agent?.handle && agent?.result_captured_at && agent?.result_status === "completed");
}

async function readJson(target, fallback) {
  if (!target || !existsSync(target)) return fallback;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function resolveWorkspacePath(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function add(severity, code, message) {
  findings.push({ severity, code, message });
}

async function finish() {
  const summary = {
    runId,
    generatedAt: new Date().toISOString(),
    stage: state.stage ?? "unknown",
    status: state.status ?? "unknown",
    counts: {
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length
    },
    findings
  };

  if (existsSync(logsDir)) {
    await writeFile(path.join(logsDir, "orchestration-audit.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    await writeFile(path.join(logsDir, "orchestration-audit.md"), renderMarkdown(summary), "utf8");
  }

  if (json) console.log(JSON.stringify(summary, null, 2));
  else printText(summary);

  const failed = summary.counts.errors > 0 || (strictWarnings && summary.counts.warnings > 0);
  process.exit(failed ? 1 : 0);
}

function renderMarkdown(summary) {
  const lines = [
    `# Orchestration Audit: ${summary.runId}`,
    "",
    "## Summary",
    "",
    `- generatedAt: ${summary.generatedAt}`,
    `- stage: ${summary.stage}`,
    `- status: ${summary.status}`,
    `- errors: ${summary.counts.errors}`,
    `- warnings: ${summary.counts.warnings}`,
    "",
    "## Findings",
    ""
  ];
  if (summary.findings.length === 0) lines.push("- none");
  for (const item of summary.findings) {
    lines.push(`- [${item.severity}] ${item.code}: ${item.message}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function printText(summary) {
  console.log(`Orchestration audit: ${summary.runId}`);
  console.log(`- stage: ${summary.stage}`);
  console.log(`- status: ${summary.status}`);
  console.log(`- errors: ${summary.counts.errors}`);
  console.log(`- warnings: ${summary.counts.warnings}`);
  if (summary.findings.length > 0) {
    console.log("- findings:");
    for (const item of summary.findings) console.log(`  - [${item.severity}] ${item.code}: ${item.message}`);
  } else {
    console.log("- findings: none");
  }
  if (existsSync(logsDir)) {
    console.log(`- report: ${path.relative(root, path.join(logsDir, "orchestration-audit.md")).replaceAll("\\", "/")}`);
  }
}
