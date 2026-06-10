import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const refresh = args.includes("--refresh");

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:repair-plan -- <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const logsDir = path.join(runDir, "logs");
const nativeDir = path.join(logsDir, "native-subagents");
const tasksDir = path.join(runDir, "tasks", "repairs");
const repairLoopPath = path.join(logsDir, "repair-loop.json");

if (!existsSync(runDir)) {
  console.error(`Run does not exist: ${runId}`);
  process.exit(1);
}

await mkdir(tasksDir, { recursive: true });

const contract = await readJson(path.join(runDir, "completion-contract.json")) ?? {};
const maxRepairRounds = Number(contract.maxRepairRounds ?? 3);
const repairLoop = await readJson(repairLoopPath) ?? { runId, maxRepairRounds, rounds: [] };
const existingRounds = repairLoop.rounds ?? [];
const nextRound = refresh && existingRounds.length > 0 ? existingRounds[existingRounds.length - 1].round : existingRounds.length + 1;

const sources = [];
for (const agent of ["tester", "reviewer"]) {
  const result = await readJson(path.join(nativeDir, `${agent}.result.json`));
  if (result) sources.push({ agent, result });
}

const grouped = new Map();
for (const source of sources) {
  for (const fix of normalizeFixes(source.agent, source.result)) {
    for (const target of fix.targetAgents) {
      const list = grouped.get(target) ?? [];
      list.push(fix);
      grouped.set(target, list);
    }
  }
}

const summary = {
  runId,
  generatedAt: new Date().toISOString(),
  round: nextRound,
  maxRepairRounds,
  sources: sources.map((source) => source.agent),
  targetAgents: [...grouped.keys()].sort(),
  fixes: [...grouped.entries()].map(([agent, fixes]) => ({ agent, fixes }))
};

repairLoop.maxRepairRounds = maxRepairRounds;
const roundEntry = {
  round: nextRound,
  at: summary.generatedAt,
  sources: summary.sources,
  targetAgents: summary.targetAgents,
  fixCount: summary.fixes.reduce((sum, item) => sum + item.fixes.length, 0),
  refreshed: refresh
};
repairLoop.rounds = refresh && existingRounds.length > 0
  ? [...existingRounds.slice(0, -1), roundEntry]
  : [...existingRounds, roundEntry];
await writeFile(repairLoopPath, `${JSON.stringify(repairLoop, null, 2)}\n`, "utf8");

await writeFile(path.join(logsDir, "repair-plan.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(path.join(logsDir, "repair-plan.md"), renderSummary(summary), "utf8");

for (const [agent, fixes] of grouped.entries()) {
  await writeFile(path.join(tasksDir, `${agent}.repair.task.md`), renderAgentTask({ runId, agent, fixes, round: nextRound, maxRepairRounds }), "utf8");
}

console.log(`Repair plan generated: ${path.relative(root, path.join(logsDir, "repair-plan.md"))}`);
console.log(`- repair round: ${nextRound}/${maxRepairRounds}`);
if (refresh) console.log("- refresh: true");
if (grouped.size === 0) {
  console.log("- no required fixes found in tester/reviewer result JSON");
} else {
  for (const [agent, fixes] of grouped.entries()) console.log(`- ${agent}: ${fixes.length} fix(es)`);
}

if (nextRound > maxRepairRounds) {
  console.error(`Repair loop exceeded maxRepairRounds (${nextRound}/${maxRepairRounds}). Stop and archive as blocked/partial, or create a narrower continuation run.`);
  process.exit(1);
}

function normalizeFixes(sourceAgent, result) {
  const fixes = [];
  for (const item of result.requiredFixes ?? []) {
    const targetAgents = normalizeTargets(item.targetAgents ?? item.owner ?? item.agent ?? result.targetAgents);
    if (targetAgents.length === 0) continue;
    fixes.push({
      id: item.id ?? `${sourceAgent}-${fixes.length + 1}`,
      sourceAgent,
      targetAgents,
      severity: item.severity ?? "medium",
      scope: item.scope ?? "",
      acceptanceCriteria: item.acceptanceCriteria ?? item.relatedAcceptanceCriteria ?? [],
      summary: textFromValue(item.summary ?? item.description ?? item.requiredChange ?? item.details ?? item),
      evidence: textFromValue(item.evidence ?? ""),
      requiredChange: textFromValue(item.requiredChange ?? item.description ?? item.details ?? "")
    });
  }
  for (const issue of result.blockingIssues ?? []) {
    const targetAgents = normalizeTargets(issue.targetAgents ?? issue.owner ?? issue.agent ?? result.targetAgents);
    if (targetAgents.length === 0) continue;
    const summary = textFromValue(issue.summary ?? issue.description ?? issue.details ?? issue);
    fixes.push({
      id: `${sourceAgent}-blocking-${fixes.length + 1}`,
      sourceAgent,
      targetAgents,
      severity: "high",
      scope: issue.scope ?? "",
      acceptanceCriteria: [],
      summary,
      evidence: textFromValue(issue.evidence ?? ""),
      requiredChange: textFromValue(issue.requiredChange ?? issue.description ?? issue.details ?? "Resolve the blocking issue and rerun verification.")
    });
  }
  return fixes;
}

function normalizeTargets(value) {
  return [...new Set((Array.isArray(value) ? value : [value]).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function textFromValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textFromValue).filter(Boolean).join("; ");
  if (typeof value === "object") {
    const preferred = [
      value.summary,
      value.description,
      value.details,
      value.message,
      value.requiredChange,
      value.impact
    ].map(textFromValue).find(Boolean);
    if (preferred) return preferred;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function renderSummary(summary) {
  const lines = [
    `# Repair Plan: ${summary.runId}`,
    "",
    `- generatedAt: ${summary.generatedAt}`,
    `- round: ${summary.round}/${summary.maxRepairRounds}`,
    `- sources: ${summary.sources.length ? summary.sources.join(", ") : "(none)"}`,
    `- targetAgents: ${summary.targetAgents.length ? summary.targetAgents.join(", ") : "(none)"}`,
    ""
  ];
  for (const item of summary.fixes) {
    lines.push(`## ${item.agent}`, "");
    for (const fix of item.fixes) {
      lines.push(`### ${fix.id}: ${fix.summary}`);
      lines.push(`- source: ${fix.sourceAgent}`);
      lines.push(`- severity: ${fix.severity}`);
      if (fix.scope) lines.push(`- scope: ${fix.scope}`);
      lines.push(`- acceptanceCriteria: ${fix.acceptanceCriteria.length ? fix.acceptanceCriteria.join(", ") : "(none)"}`);
      if (fix.evidence) lines.push(`- evidence: ${fix.evidence}`);
      if (fix.requiredChange) lines.push(`- requiredChange: ${fix.requiredChange}`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderAgentTask({ runId, agent, fixes, round, maxRepairRounds }) {
  const lines = [
    `# Repair Task: ${agent}`,
    "",
    `- runId: ${runId}`,
    `- agent: ${agent}`,
    `- repairRound: ${round}/${maxRepairRounds}`,
    "- source: tester/reviewer requiredFixes",
    "",
    "## Rules",
    "",
    "- Only fix the items assigned to this agent.",
    "- Do not edit unrelated business files.",
    "- Reference the RF id in your result JSON and handoff.",
    "- After repair, write your normal native result files and let the main agent rerun tester/reviewer.",
    "",
    "## Required Fixes",
    ""
  ];
  for (const fix of fixes) {
    lines.push(`### ${fix.id}`);
    lines.push(`- severity: ${fix.severity}`);
    lines.push(`- sourceAgent: ${fix.sourceAgent}`);
    if (fix.scope) lines.push(`- scope: ${fix.scope}`);
    lines.push(`- acceptanceCriteria: ${fix.acceptanceCriteria.length ? fix.acceptanceCriteria.join(", ") : "(none)"}`);
    lines.push(`- summary: ${fix.summary}`);
    if (fix.evidence) lines.push(`- evidence: ${fix.evidence}`);
    if (fix.requiredChange) lines.push(`- requiredChange: ${fix.requiredChange}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function readJson(target) {
  if (!existsSync(target)) return null;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch (error) {
    console.error(`Cannot parse result JSON: ${path.relative(root, target)}`);
    console.error(error.message);
    process.exit(1);
  }
}
