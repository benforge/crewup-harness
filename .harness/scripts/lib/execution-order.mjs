export { executionOrder } from "./agent-roles.mjs";
import { executionOrder } from "./agent-roles.mjs";

export function executionOrderIndex(agentId) {
  const index = executionOrder.indexOf(agentId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function compareExecutionOrder(left, right) {
  const delta = executionOrderIndex(left) - executionOrderIndex(right);
  if (delta !== 0) return delta;
  return String(left).localeCompare(String(right));
}

export function sortByExecutionOrder(items) {
  return [...items].sort(compareExecutionOrder);
}
