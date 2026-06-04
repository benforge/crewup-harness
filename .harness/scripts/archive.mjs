import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { resolveScriptPath } from "./lib/script-root.mjs";
import { healthForStatus, readRunState, writeRunState, writeRunStatus, writeRunSummary } from "./lib/run-lifecycle.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const outcome = valueOf("--outcome=") ?? "partial";
const reason = valueOf("--reason=") ?? "";

const allowed = new Set(["success", "partial", "blocked", "canceled", "failed"]);
if (!runId || !allowed.has(outcome)) {
  console.error("Usage: npx crewup archive <run-id> --outcome=<success|partial|blocked|canceled|failed> [--reason=<reason>]");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const current = await readRunState(root, runId);
const status = statusForOutcome(outcome, current?.status);
const now = new Date().toISOString();
const next = {
  type: "none",
  description: outcome === "success" ? "Run archived successfully." : "Run archived with non-success outcome; create a continuation run if needed.",
  command: ""
};
const state = await writeRunState(root, runId, {
  ...current,
  status,
  outcome,
  archived: true,
  archivedAt: now,
  reason,
  health: healthForStatus(status, outcome, reason),
  nextAction: next,
  archive: {
    outcome,
    reason,
    archivedAt: now
  }
});

await writeRunSummary(root, runId, { reason, archiveOutcome: outcome });
await writeRunStatus(root, runId, state);
await writeArchiveSummary({ runId, state, outcome, reason, archivedAt: now });
runReport(runId);
const refreshed = await readRunState(root, runId);
if (refreshed) await writeRunStatus(root, runId, refreshed);

console.log(`Run archived: ${runId}`);
console.log(`- status: ${state.status}`);
console.log(`- outcome: ${state.outcome}`);
console.log(`- summary: .harness/runs/${runId}/RUN_SUMMARY.md`);
console.log(`- status card: .harness/runs/${runId}/RUN_STATUS.md`);
console.log(`- archive: .harness/runs/${runId}/logs/archive/archive-summary.md`);

function statusForOutcome(value, currentStatus) {
  if (value === "success") return "done";
  if (value === "blocked") return "blocked";
  if (value === "canceled") return "canceled";
  if (value === "failed") return "failed";
  return currentStatus === "done" ? "done" : "partial";
}

async function writeArchiveSummary({ runId: currentRunId, state, outcome: value, reason: archiveReason, archivedAt }) {
  const archiveDir = path.join(root, ".harness", "runs", currentRunId, "logs", "archive");
  await mkdir(archiveDir, { recursive: true });
  const lines = [
    `# Archive Summary: ${currentRunId}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| archivedAt | ${archivedAt} |`,
    `| status | ${state.status} |`,
    `| outcome | ${value} |`,
    `| stage | ${state.stage ?? "unknown"} |`,
    `| reason | ${archiveReason || "none"} |`,
    `| branch | ${state.git?.branch ?? "(none)"} |`,
    "",
    "Archive records the state of this run. It does not imply success unless outcome is `success`.",
    ""
  ];
  await writeFile(path.join(archiveDir, "archive-summary.md"), `${lines.join("\n")}\n`, "utf8");
}

function runReport(currentRunId) {
  const result = spawnSync(process.execPath, [resolveScriptPath(root, "report.mjs"), currentRunId], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    console.error("Archive completed, but report generation failed.");
    process.exit(result.status ?? 1);
  }
}

function valueOf(prefix) {
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}
