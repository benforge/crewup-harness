export const executionOrder = [
  "pm",
  "requirements-plan",
  "requirements",
  "architect",
  "frontend",
  "docs",
  "backend",
  "database",
  "devops",
  "tester",
  "reviewer",
  "release"
];

export const planningAgentIds = new Set(["pm", "requirements-plan", "requirements", "architect"]);
export const implementationAgentIds = new Set(["frontend", "docs", "backend", "database", "devops"]);
export const codeImplementationAgentIds = new Set(["frontend", "backend", "database", "devops"]);
export const writeOwnerAgentIds = new Set([...implementationAgentIds, "tester"]);
export const verificationAgentIds = new Set(["tester", "reviewer", "release"]);

export const stageOrder = [
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

export const stageOwners = {
  intake: ["pm"],
  requirements_plan: ["requirements-plan"],
  requirements_confirm: ["requirements"],
  plan: ["architect"],
  implement: [...implementationAgentIds],
  verify: ["tester"],
  review: ["reviewer"],
  release: ["release"],
  done: []
};

export function isPlanningAgent(agentId) {
  return planningAgentIds.has(agentId);
}

export function isImplementationAgent(agentId) {
  return implementationAgentIds.has(agentId);
}

export function isCodeImplementationAgent(agentId) {
  return codeImplementationAgentIds.has(agentId);
}

export function isWriteOwnerAgent(agentId) {
  return writeOwnerAgentIds.has(agentId);
}

export function isDocsOnlyAgentSet(agents) {
  const taskAgents = normalizeAgentSet(agents);
  if (!taskAgents.has("docs")) return false;
  return ![...planningAgentIds, ...codeImplementationAgentIds].some((agent) => taskAgents.has(agent));
}

export function isLiteImplementationOnlyAgentSet(agents, workflowProfile) {
  if (workflowProfile !== "lite") return false;
  const taskAgents = normalizeAgentSet(agents);
  return [...codeImplementationAgentIds].some((agent) => taskAgents.has(agent))
    && ![...planningAgentIds].some((agent) => taskAgents.has(agent));
}

export function normalizeAgentSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value.filter(Boolean));
  return new Set();
}
