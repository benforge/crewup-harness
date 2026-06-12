import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export function requiresBrowserRuntimeVerification({ state, tasksDir }) {
  if (state?.runtimeVerificationRequired === true) return true;
  const profile = state?.workflowProfile ?? "";
  if (!["standard", "full"].includes(profile)) return false;
  return availableTaskAgents(tasksDir).has("frontend");
}

export async function browserRuntimeVerificationProblems({ root, runId, state, tasksDir }) {
  if (!requiresBrowserRuntimeVerification({ state, tasksDir })) return [];

  const logsDir = path.join(root, ".harness", "runs", runId, "logs");
  const smokePath = path.join(logsDir, "preview-smoke.json");
  if (!existsSync(smokePath)) {
    return [
      "This run requires browser runtime preview smoke before success. Run `npx crewup preview-smoke <run-id> --browser --url=<local-url>` after starting the app."
    ];
  }

  let payload;
  try {
    payload = JSON.parse(await readFile(smokePath, "utf8"));
  } catch (error) {
    return [`Cannot parse logs/preview-smoke.json: ${error.message}`];
  }

  const problems = [];
  if (payload.mode !== "browser") {
    problems.push("This run requires browser-mode preview smoke, not fetch-only preview smoke. Rerun `npx crewup preview-smoke <run-id> --browser --url=<local-url>`.");
  }
  if (payload.status !== "passed") {
    problems.push("Browser runtime preview smoke did not pass. Route the issue to the owning implementation/devops agent before success.");
  }
  return problems;
}

function availableTaskAgents(tasksDir) {
  if (!existsSync(tasksDir)) return new Set();
  return new Set(
    readdirSync(tasksDir)
      .filter((name) => name.endsWith(".task.md"))
      .map((name) => name.replace(/\.task\.md$/, ""))
  );
}
