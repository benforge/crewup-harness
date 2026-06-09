import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const closeoutOnly = args.includes("--closeout-only");
const reopenBlocked = args.includes("--reopen-blocked");
const runArg = args.find((arg) => !arg.startsWith("--"));
const runsRoot = path.join(root, ".harness", "runs");

if (!existsSync(runsRoot)) {
  console.error("Missing .harness/runs");
  process.exit(1);
}

const runIds = runArg
  ? [runArg]
  : (await readdir(runsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

const repairs = [];

for (const runId of runIds) {
  const statePath = path.join(runsRoot, runId, "state.json");
  if (!existsSync(statePath)) {
    repairs.push({ runId, action: "skip", reason: "missing state.json" });
    continue;
  }

  const state = JSON.parse(await readFile(statePath, "utf8"));
  const before = { stage: state.stage, status: state.status, archived: Boolean(state.archived) };
  const next = { ...state };
  const notes = [];

  if (closeoutOnly && !isCloseoutRepairAllowed(next)) {
    repairs.push({ runId, action: "skip", reason: "closeout-only requires a final or archived run", before, after: before });
    continue;
  }

  if (next.status === "done" && next.stage !== "done") {
    next.stage = "done";
    notes.push("status=done implies stage=done");
  }
  if (next.status === "archived" && next.stage !== "done") {
    next.stage = "done";
    notes.push("archived run should be at done stage");
  }
  if (next.status === "ready-for-user-review") {
    next.status = "waiting_user";
    notes.push("normalized ready-for-user-review to waiting_user");
  }
  if (reopenBlocked && next.archived && ["blocked", "partial", "failed"].includes(next.status)) {
    next.archived = false;
    delete next.archivedAt;
    next.nextAction = {
      type: "agent",
      description: "Run was reopened from a non-success archive; continue the current run with the owning agent.",
      command: `npx crewup next-agent ${runId}`
    };
    const inferredStage = await inferStageFromNativeState(runId);
    if (inferredStage && stageRank(inferredStage) > stageRank(next.stage)) {
      next.stage = inferredStage;
      notes.push(`reopened non-success archive and inferred stage=${inferredStage}`);
    } else {
      notes.push("reopened non-success archive");
    }
  }
  if (!next.confirmations) {
    next.confirmations = {};
    notes.push("added confirmations object");
  }
  if (!Array.isArray(next.transitions)) {
    next.transitions = [];
    notes.push("added transitions array");
  }

  if (notes.length === 0) {
    repairs.push({ runId, action: "none", before, after: before });
    continue;
  }

  next.updatedAt = new Date().toISOString();
  next.migrations = [
    ...(next.migrations ?? []),
    {
      id: "repair-state-2026-05",
      at: next.updatedAt,
      notes
    }
  ];

  if (apply) {
    await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await writeRepairAudit(runId, { before, after: { stage: next.stage, status: next.status, archived: Boolean(next.archived) }, notes, closeoutOnly });
  }

  repairs.push({
    runId,
    action: apply ? "applied" : "would_apply",
    before,
    after: { stage: next.stage, status: next.status },
    notes
  });
}

console.log(JSON.stringify({ apply, closeoutOnly, reopenBlocked, repairs }, null, 2));

function isCloseoutRepairAllowed(state) {
  return Boolean(state.archived) || ["done", "canceled", "failed", "blocked", "partial"].includes(state.status);
}

async function writeRepairAudit(runId, entry) {
  const logsDir = path.join(runsRoot, runId, "logs");
  const target = path.join(logsDir, "state-repair.md");
  await mkdir(logsDir, { recursive: true });
  const previous = existsSync(target) ? await readFile(target, "utf8") : `# State Repair Audit: ${runId}\n\n`;
  const line = [
    `## ${new Date().toISOString()}`,
    "",
    `- action: repair-state${entry.closeoutOnly ? " --closeout-only" : ""}${reopenBlocked ? " --reopen-blocked" : ""}`,
    `- before: stage=${entry.before.stage ?? "unknown"}, status=${entry.before.status ?? "unknown"}, archived=${entry.before.archived ? "yes" : "no"}`,
    `- after: stage=${entry.after.stage ?? "unknown"}, status=${entry.after.status ?? "unknown"}, archived=${entry.after.archived ? "yes" : "no"}`,
    `- notes: ${entry.notes.join("; ") || "none"}`,
    ""
  ].join("\n");
  await writeFile(target, `${previous.trimEnd()}\n\n${line}`, "utf8");
}

async function inferStageFromNativeState(runId) {
  const target = path.join(runsRoot, runId, "logs", "native-subagents", "native-state.json");
  if (!existsSync(target)) return "";
  const native = JSON.parse(await readFile(target, "utf8"));
  const agents = native.agents ?? [];
  const has = (names) => agents.some((agent) => names.includes(agent.agent) && (agent.handle || agent.result_captured_at || agent.result_status));
  if (has(["release"])) return "release";
  if (has(["reviewer"])) return "review";
  if (has(["tester"])) return "verify";
  if (has(["frontend", "backend", "database", "devops", "docs"])) return "implement";
  if (has(["architect"])) return "plan";
  if (has(["requirements"])) return "requirements_confirm";
  if (has(["requirements-plan"])) return "requirements_plan";
  return "";
}

function stageRank(stage) {
  const order = ["intake", "requirements_plan", "requirements_confirm", "plan", "implement", "verify", "review", "release", "done"];
  return order.indexOf(stage) >= 0 ? order.indexOf(stage) : -1;
}
