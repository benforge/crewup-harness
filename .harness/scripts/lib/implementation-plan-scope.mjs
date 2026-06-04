import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
export { implementationAgentIds } from "./agent-roles.mjs";
import { implementationAgentIds } from "./agent-roles.mjs";

const agentPatterns = {
  frontend: [/\bfrontend\b/i, /\bfront-end\b/i],
  docs: [/\bdocs\b/i, /\bdocumentation\b/i],
  backend: [/\bbackend\b/i, /\bback-end\b/i],
  database: [/\bdatabase\b/i, /\bdb\b/i],
  devops: [/\bdevops\b/i, /\bdeploy(?:ment)?\b/i, /\binfra(?:structure)?\b/i]
};

export function implementationPlanPath(root, runId) {
  return path.join(root, ".harness", "runs", runId, "artifacts", "implementation-plan.md");
}

export function readImplementationPlan(root, runId) {
  const file = implementationPlanPath(root, runId);
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

export function implementationPlanAssignsAgent(content, agentId) {
  if (!implementationAgentIds.has(agentId)) return true;
  const patterns = agentPatterns[agentId] ?? [new RegExp(`\\b${escapeRegExp(agentId)}\\b`, "i")];
  return String(content ?? "")
    .split(/\r?\n/)
    .some((line) => patterns.some((pattern) => pattern.test(line)) && !isExclusionLine(line));
}

export function isImplementationAgentUnassigned(agentId, { root = process.cwd(), runId = "" } = {}) {
  if (!implementationAgentIds.has(agentId)) return false;
  const plan = readImplementationPlan(root, runId);
  if (plan === null) return true;
  return !implementationPlanAssignsAgent(plan, agentId);
}

export function implementationPlanSkipReason(agentId) {
  return `artifacts/implementation-plan.md is missing or does not assign ${agentId}`;
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isExclusionLine(line) {
  return /\b(not assigned|not required|excluded|out of scope|skip|skipped|not needed)\b/i.test(line);
}
