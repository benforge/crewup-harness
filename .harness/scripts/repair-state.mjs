import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
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
  const before = { stage: state.stage, status: state.status };
  const next = { ...state };
  const notes = [];

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
  }

  repairs.push({
    runId,
    action: apply ? "applied" : "would_apply",
    before,
    after: { stage: next.stage, status: next.status },
    notes
  });
}

console.log(JSON.stringify({ apply, repairs }, null, 2));
