import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { businessPathPatterns, productDocsPath } from "./project-profile.mjs";

const implementationAgents = new Set(["frontend", "docs", "backend", "database", "devops"]);
const stageOrder = [
  "intake",
  "requirements_plan",
  "requirements_confirm",
  "plan",
  "implement",
  "verify",
  "review",
  "release",
  "done"
];
const stageOwners = {
  intake: ["pm"],
  requirements_plan: ["requirements-plan"],
  requirements_confirm: ["requirements"],
  plan: ["architect"],
  implement: ["frontend", "docs", "backend", "database", "devops"],
  verify: ["tester"],
  review: ["reviewer"],
  release: ["release"],
  done: []
};
let activeBusinessPathPatterns = [
  "src/**",
  "app/**",
  "lib/**",
  "libs/**",
  "services/**",
  "modules/**",
  "projects/**",
  "infra/**",
  ".github/workflows/**"
];
let activeProductDocsPath = "";

export function configureDelegationGuard(projectProfile = {}) {
  const configuredBusinessPaths = businessPathPatterns(projectProfile);
  if (configuredBusinessPaths.length > 0) activeBusinessPathPatterns = configuredBusinessPaths;
  activeProductDocsPath = productDocsPath(projectProfile, activeProductDocsPath);
}

export function collectWorkspaceChanges(root, runId, state = {}) {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) return [];

  const initialDirty = new Set((state.git?.dirtyAtStart ?? []).map(statusPath).filter(Boolean));
  const sourceRequirement = normalizeRelPath(state.sourceRequirement ?? "");
  const runPrefix = `.harness/runs/${runId}`;

  return result.stdout
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(statusPath)
    .filter(Boolean)
    .filter((file) => file !== sourceRequirement)
    .filter((file) => file !== runPrefix && !file.startsWith(`${runPrefix}/`))
    .filter((file) => !file.startsWith(".git/"))
    .filter((file) => !file.startsWith("node_modules/"))
    .filter((file) => !initialDirty.has(file));
}

export function readChangedFilesManifest(root, runId) {
  const manifestPath = path.join(root, ".harness", "runs", runId, "logs", "changed-files.json");
  if (!existsSync(manifestPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    return manifestFileEntries(parsed).map((entry) => entry.path);
  } catch {
    return [];
  }
}

export async function readNativeState(root, runId) {
  const nativeStatePath = path.join(root, ".harness", "runs", runId, "logs", "native-subagents", "native-state.json");
  if (!existsSync(nativeStatePath)) return null;
  try {
    return JSON.parse(await readFile(nativeStatePath, "utf8"));
  } catch {
    return null;
  }
}

export function evaluateDelegationGuard({ root, runId, state = {}, workspaceFiles = [], manifestFiles = [], nativeState = null, targetStage = "", requiredAgentsMode = "completion" }) {
  const workspace = unique(workspaceFiles.map(filePathOf).map(normalizeRelPath).filter(Boolean));
  const manifest = unique(manifestFiles.map(filePathOf).map(normalizeRelPath).filter(Boolean));
  const combined = unique([...workspace, ...manifest]);
  const businessFiles = combined.filter(isBusinessCodePath);
  if (businessFiles.length === 0) return [];

  const stage = String(targetStage || state.stage || "");
  const problems = [];
  const workspaceBusiness = workspace.filter(isBusinessCodePath);
  const manifestBusiness = new Set(manifest.filter(isBusinessCodePath));
  const unrecorded = workspaceBusiness.filter((file) => !manifestBusiness.has(file));
  if (unrecorded.length > 0) {
    problems.push(`Business code changes are not recorded in changed-files manifest: ${unrecorded.join(", ")}`);
  }

  if (!nativeState) {
    problems.push(`Business code changes detected without native subagent records: ${businessFiles.join(", ")}`);
    problems.push("Formal code work must be delegated to implementation agents; the main agent may not complete it in the main window.");
    return problems;
  }

  if (nativeState.fallback) {
    problems.push(`Business code changes detected but native fallback is recorded (${nativeState.fallback.reason}).`);
    problems.push("Fallback is a blocked state. It does not authorize the main agent to finish delegated implementation work.");
  }

  const taskAgents = readTaskAgents(root, runId);
  const requiredAgents = requiredAgentsMode === "entry"
    ? requiredNativeAgentsForStageEntry(stage, { root, runId, state, taskAgents })
    : requiredNativeAgentsForStageCompletion(stage, { root, runId, state, taskAgents });
  problems.push(...nativeExecutionProblems({
    nativeState,
    requiredAgents,
    label: stage || "current stage"
  }));

  const executedImplementationAgents = (nativeState.agents ?? [])
    .filter((agent) => implementationAgents.has(agent.agent) && hasCompletedNativeResult(agent));
  if (businessFiles.some((file) => !isProductDocPath(file)) && executedImplementationAgents.length === 0) {
    problems.push(`Business code changes detected before ${stage || "the current stage"}, but no completed implementation subagent record was found.`);
    problems.push("Expected at least one completed frontend, docs, backend, database, or devops native result.");
  }

  problems.push(...businessFileOwnershipProblems({ root, runId, state, nativeState, businessFiles, taskAgents, stage }));
  return problems;
}

export function nativeExecutionProblems({ nativeState, requiredAgents, label = "stage" }) {
  if (!requiredAgents.length) return [];
  const problems = [];
  if (!nativeState) {
    problems.push(`Missing native subagent execution record before ${label}: ${requiredAgents.join(", ")}.`);
    return problems;
  }
  if (nativeState.fallback) {
    problems.push(`Native subagent gate failed before ${label}: fallback is recorded (${nativeState.fallback.reason}).`);
    return problems;
  }

  const byAgent = new Map((nativeState.agents ?? []).map((agent) => [agent.agent, agent]));
  const missing = requiredAgents.filter((agent) => !byAgent.has(agent));
  const unexecuted = requiredAgents.filter((agent) => byAgent.has(agent) && !byAgent.get(agent).handle);
  const withoutResult = requiredAgents.filter((agent) => {
    const item = byAgent.get(agent);
    return item ? !item.result_captured_at && !item.result_status : false;
  });
  const unfinished = requiredAgents.filter((agent) => {
    const item = byAgent.get(agent);
    return item ? ["planned", "running", "error"].includes(item.status) : false;
  });
  const notCompleted = requiredAgents.filter((agent) => {
    const item = byAgent.get(agent);
    return item ? item.result_status && item.result_status !== "completed" : false;
  });

  if (missing.length > 0) problems.push(`Required native agents missing from plan before ${label}: ${missing.join(", ")}`);
  if (unexecuted.length > 0) problems.push(`Required native agents are missing native handles before ${label}: ${unexecuted.join(", ")}`);
  if (withoutResult.length > 0) problems.push(`Required native agent results were not captured before ${label}: ${withoutResult.join(", ")}`);
  if (unfinished.length > 0) problems.push(`Required native agents not finished before ${label}: ${unfinished.join(", ")}`);
  if (notCompleted.length > 0) problems.push(`Required native agents did not complete successfully before ${label}: ${notCompleted.join(", ")}`);
  return problems;
}

export function isBusinessCodePath(file) {
  const normalized = normalizeRelPath(file);
  if (!normalized) return false;
  return activeBusinessPathPatterns.some((pattern) => matchPattern(normalized, pattern));
}

export function requiredNativeAgentsForStageEntry(targetStage, { root = process.cwd(), runId = "", state = {}, taskAgents = null } = {}) {
  const stage = String(targetStage || state.stage || "");
  const previous = previousStage(stage);
  if (!previous) return [];
  return requiredNativeAgentsForStageCompletion(previous, { root, runId, state, taskAgents });
}

export function requiredNativeAgentsForStageCompletion(targetStage, { root = process.cwd(), runId = "", state = {}, taskAgents = null } = {}) {
  const stage = String(targetStage || state.stage || "");
  if (!stage) return [];
  const tasks = normalizeTaskAgents(taskAgents ?? readTaskAgents(root, runId));
  const index = stageOrder.indexOf(stage);
  if (index === -1) return [];

  const required = [];
  for (let current = 0; current <= index; current += 1) {
    required.push(...(stageOwners[stageOrder[current]] ?? []));
  }
  return unique(required.filter((agent) => tasks.has(agent)));
}

export function completedNativePrerequisitesForAgent(agentId, { root = process.cwd(), runId = "", taskAgents = null } = {}) {
  const tasks = normalizeTaskAgents(taskAgents ?? readTaskAgents(root, runId));
  if (agentId === "pm" || agentId === "requirements-plan") return [];
  if (agentId === "requirements") return ["pm", "requirements-plan"].filter((agent) => tasks.has(agent));
  if (agentId === "architect") return ["pm", "requirements-plan", "requirements"].filter((agent) => tasks.has(agent));
  if (implementationAgents.has(agentId)) return ["pm", "requirements-plan", "requirements", "architect"].filter((agent) => tasks.has(agent));
  if (agentId === "tester") {
    return [
      "pm",
      "requirements-plan",
      "requirements",
      "architect",
      ...[...implementationAgents]
    ].filter((agent) => tasks.has(agent));
  }
  if (agentId === "reviewer") return ["tester"].filter((agent) => tasks.has(agent));
  if (agentId === "release") return ["reviewer"].filter((agent) => tasks.has(agent));
  return [];
}

export function hasCompletedNativeResult(agent) {
  return Boolean(agent?.handle && agent?.result_captured_at && agent?.result_status === "completed");
}

function businessFileOwnershipProblems({ root, runId, state, nativeState, businessFiles, taskAgents, stage }) {
  const taskScopes = readTaskAllowedScopes(root, runId);
  const completedAgents = (nativeState.agents ?? []).filter(hasCompletedNativeResult);
  const problems = [];

  for (const file of businessFiles) {
    if (productDocAllowed({ file, state, stage, nativeState, taskAgents })) continue;
    const owners = completedAgents.filter((agent) => {
      if (!taskAgents.has(agent.agent)) return false;
      const allowed = taskScopes.get(agent.agent) ?? [];
      return allowed.some((pattern) => matchPattern(file, pattern));
    });
    if (owners.length === 0) {
      problems.push(`Changed file is not owned by any completed native agent allowed scope: ${file}`);
    }
  }

  return problems;
}

function productDocAllowed({ file, state, stage, nativeState, taskAgents }) {
  if (!isProductDocPath(file)) return false;
  if (!["release", "done"].includes(stage || state.stage)) return false;
  if (!taskAgents.has("release")) return false;
  const release = (nativeState.agents ?? []).find((agent) => agent.agent === "release");
  return hasCompletedNativeResult(release);
}

function readTaskAgents(root, runId) {
  const tasksDir = path.join(root, ".harness", "runs", runId, "tasks");
  if (!existsSync(tasksDir)) return new Set();
  try {
    return new Set(
      readdirSync(tasksDir)
        .filter((name) => name.endsWith(".task.md"))
        .map((name) => name.replace(/\.task\.md$/, ""))
    );
  } catch {
    return new Set();
  }
}

function readTaskAllowedScopes(root, runId) {
  const tasksDir = path.join(root, ".harness", "runs", runId, "tasks");
  const scopes = new Map();
  if (!existsSync(tasksDir)) return scopes;

  for (const fileName of readdirSync(tasksDir).filter((name) => name.endsWith(".task.md"))) {
    const agent = fileName.replace(/\.task\.md$/, "");
    const content = readFileSync(path.join(tasksDir, fileName), "utf8");
    scopes.set(agent, extractAllowedPatterns(content));
  }
  return scopes;
}

function extractAllowedPatterns(task) {
  const lines = String(task ?? "").split(/\r?\n/);
  const patterns = [];
  let inAllowed = false;
  for (const line of lines) {
    if (line.startsWith("## ") && /允许修改范围|Allowed Write Scope|Allowed/i.test(line)) {
      inAllowed = true;
      continue;
    }
    if (inAllowed && line.startsWith("## ")) break;
    if (inAllowed && line.trim().startsWith("- ")) {
      const value = normalizeRelPath(line.trim().slice(2));
      if (value && value !== "无") patterns.push(value);
    }
  }
  return patterns;
}

function manifestFileEntries(parsed) {
  const files = Array.isArray(parsed?.files) ? parsed.files : [];
  return files
    .map((item) => {
      if (typeof item === "string") return { path: normalizeRelPath(item) };
      return { ...item, path: normalizeRelPath(item?.path) };
    })
    .filter((item) => item.path);
}

function filePathOf(item) {
  if (typeof item === "string") return item;
  return item?.path ?? "";
}

function previousStage(stage) {
  const index = stageOrder.indexOf(stage);
  return index > 0 ? stageOrder[index - 1] : "";
}

function isProductDocPath(file) {
  const normalized = normalizeRelPath(file);
  return Boolean(activeProductDocsPath) && (normalized === activeProductDocsPath || normalized.startsWith(`${activeProductDocsPath}/`));
}

function statusPath(line) {
  const value = String(line ?? "");
  if (!value.trim()) return "";
  const rename = value.match(/^R.\s+(.+?)\s+->\s+(.+)$/);
  if (rename) return normalizeRelPath(unquoteStatusPath(rename[2]));
  const status = value.match(/^.{1,2}\s+(.+)$/);
  return normalizeRelPath(unquoteStatusPath(status ? status[1] : value));
}

function unquoteStatusPath(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith("\"") || !trimmed.endsWith("\"")) return trimmed;
  const inner = trimmed.slice(1, -1);
  const bytes = [];
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] === "\\" && /[0-7]/.test(inner[index + 1] ?? "")) {
      const octal = inner.slice(index + 1).match(/^[0-7]{1,3}/)?.[0] ?? "";
      bytes.push(Number.parseInt(octal, 8));
      index += octal.length;
    } else if (inner[index] === "\\" && inner[index + 1]) {
      bytes.push(inner.charCodeAt(index + 1));
      index += 1;
    } else {
      bytes.push(inner.charCodeAt(index));
    }
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

function normalizeRelPath(inputPath) {
  const normalized = String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
  if (!normalized || normalized.includes("..")) return "";
  return normalized;
}

function matchPattern(relPath, pattern) {
  const file = normalizeRelPath(relPath);
  const normalizedPattern = normalizeRelPath(pattern);
  if (!file || !normalizedPattern) return false;
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return file === prefix || file.startsWith(`${prefix}/`);
  }
  if (normalizedPattern.includes("*")) {
    const escaped = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replaceAll("\\*\\*", ".*")
      .replaceAll("\\*", "[^/]*");
    return new RegExp(`^${escaped}$`).test(file);
  }
  return file === normalizedPattern || file.startsWith(`${normalizedPattern.replace(/\/+$/, "")}/`);
}

function normalizeTaskAgents(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value.filter(Boolean));
  return new Set();
}

function unique(items) {
  return [...new Set(items)];
}
