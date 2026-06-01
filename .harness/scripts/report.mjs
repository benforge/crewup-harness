import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const runId = process.argv[2];

if (!runId) {
  console.error("Please provide runId, for example: npx crewup report <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs");
const nativeDir = path.join(logsDir, "native-subagents");

if (!existsSync(runDir)) {
  console.error(`run does not exist: ${runId}`);
  process.exit(1);
}

const state = await readJson(path.join(runDir, "state.json"), {});
const input = await readFile(path.join(runDir, "input.md"), "utf8").catch(() => "");
const taskNames = existsSync(tasksDir) ? (await readdir(tasksDir)).filter((name) => name.endsWith(".task.md")).sort() : [];
const artifactNames = existsSync(artifactsDir) ? (await readdir(artifactsDir)).sort() : [];
const nativeState = await readJson(path.join(nativeDir, "native-state.json"), null);
const changedFiles = await readJson(path.join(logsDir, "changed-files.json"), { files: [] });
const archiveAudit = await readArchiveAudit(path.join(logsDir, "archive", "git-commit.md"));
const contextBudget = await readJson(path.join(logsDir, "context", "context-budget.json"), null);
const tokenLedger = await readJson(path.join(logsDir, "token-ledger.json"), null);

const agentRows = await buildAgentRows(nativeState, taskNames);
const artifactRows = await buildArtifactRows(artifactNames);
const contextBudgetRows = buildContextBudgetRows(contextBudget);
const tokenRows = buildTokenRows(tokenLedger);
const deliveryStatus = deliveryStatusFor({ state, archiveAudit, agentRows, artifactRows });
const verdictTag = verdictTagFor({ deliveryStatus, archiveAudit, agentRows, artifactRows });

const lines = [
  `# CrewUp Delivery Report: ${runId}`,
  "",
  "## Summary",
  "",
  "| Item | Value |",
  "| --- | --- |",
  `| generatedAt | ${cell(new Date().toISOString())} |`,
  `| stage | ${cell(state.stage ?? "unknown")} |`,
  `| status | ${cell(state.status ?? "unknown")} |`,
  `| workflowProfile | ${cell(state.workflowProfile ?? "unknown")} |`,
  `| deliveryStatus | ${cell(deliveryStatus)} |`,
  `| verdictTag | ${cell(verdictTag)} |`,
  `| archive | ${cell(archiveAudit.status || "no record")} |`,
  "",
  "## Request",
  "",
  blockquote(firstLines(input, 8) || "No request recorded."),
  "",
  "## Execution Overview",
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| tasks | ${taskNames.length} |`,
  `| agents | ${agentRows.length} |`,
  `| artifacts | ${artifactRows.length} |`,
  `| context estimated tokens | ${contextBudgetTotal(contextBudget)} |`,
  `| ledger estimated tokens | ${tokenLedger?.estimate?.estimatedTokens ?? "not generated"} |`,
  `| changed files | ${(changedFiles.files ?? []).length} |`,
  `| archive selected paths | ${archiveAudit.selectedPaths.length} |`,
  "",
  "## Context Budget",
  "",
  "| Agent | Mode | Candidate Files | Included Files | Included Bytes | Estimated Tokens | Reasons |",
  "| --- | --- | ---: | ---: | ---: | ---: | --- |",
  ...(contextBudgetRows.length ? contextBudgetRows.map(renderContextBudgetRow) : ["| none | - | 0 | 0 | 0 | 0 | run context budget not generated |"]),
  "",
  "## Token Ledger",
  "",
  "| Kind | Files | Chars | Estimated Tokens | Bytes |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...(tokenRows.length ? tokenRows.map(renderTokenRow) : ["| not generated | 0 | 0 | 0 | 0 |"]),
  "",
  "## Agent Results",
  "",
  "| Agent | Type | Status | Result File | Summary | Files / Artifacts | Tests | Blockers | Handoff |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...(agentRows.length ? agentRows.map(renderAgentRow) : ["| none | - | - | - | - | - | - | - | - |"]),
  "",
  "## Artifacts",
  "",
  "| Artifact | Status | Size | Summary |",
  "| --- | --- | ---: | --- |",
  ...(artifactRows.length ? artifactRows.map((item) => `| \`${item.name}\` | ${item.status} | ${item.bytes} | ${cell(item.summary)} |`) : ["| none | - | 0 | - |"]),
  "",
  "## Change List",
  "",
  "| Source | Count | Details |",
  "| --- | ---: | --- |",
  `| changed-files manifest | ${(changedFiles.files ?? []).length} | ${cell((changedFiles.files ?? []).join("<br>") || "none")} |`,
  `| archive selected paths | ${archiveAudit.selectedPaths.length} | ${cell(archiveAudit.selectedPaths.join("<br>") || "none")} |`,
  `| archive unselected changes | ${archiveAudit.unselectedChanges.length} | ${cell(archiveAudit.unselectedChanges.join("<br>") || "none")} |`,
  "",
  "## Archive",
  "",
  "| Item | Value |",
  "| --- | --- |",
  `| archive status | ${cell(archiveAudit.status || "no record")} |`,
  `| reason | ${cell(archiveAudit.reason || "none")} |`,
  `| commit | ${cell(archiveAudit.commit || "not generated")} |`,
  `| audit | ${existsSync(path.join(logsDir, "archive", "git-commit.md")) ? "`logs/archive/git-commit.md`" : "none"} |`,
  "",
  "## Verdict",
  "",
  `> verdict: **${verdictTag}**`,
  "",
  verdictFor({ deliveryStatus, archiveAudit, agentRows, artifactRows }),
  ""
];

const target = path.join(logsDir, "run-report.md");
await writeFile(target, `${lines.join("\n")}\n`, "utf8");
console.log(`Run report written to: ${path.relative(root, target).replaceAll("\\", "/")}`);

async function buildAgentRows(native, taskNames) {
  const rows = [];
  const taskSet = new Set(taskNames.map((name) => name.replace(/\.task\.md$/, "")));
  const agents = native?.agents?.length
    ? native.agents
    : [...taskSet].map((agent) => ({
        agent,
        status: "planned",
        result_status: "",
        handle: "",
        result_path: "",
        result_captured_at: ""
      }));

  for (const agent of agents) {
    const resultPath = agent.result_path ? resolveWorkspacePath(agent.result_path) : "";
    const resultExists = Boolean(resultPath && existsSync(resultPath));
    const resultJsonPath = agent.result_json_path ? resolveWorkspacePath(agent.result_json_path) : resultPath.replace(/\.result\.md$/, ".result.json");
    const parsedJson = resultJsonPath && existsSync(resultJsonPath) ? await readJson(resultJsonPath, {}) : {};
    const parsed = Object.keys(parsedJson).length ? parseAgentResultJson(parsedJson) : (resultExists ? parseAgentResult(await readFile(resultPath, "utf8")) : {});
    rows.push({
      agent: agent.agent,
      type: agent.kind || agent.role || inferAgentType(agent.agent),
      status: [agent.status, agent.result_status ? `result=${agent.result_status}` : ""].filter(Boolean).join("<br>") || "planned",
      resultFile: resultExists ? `\`${path.relative(runDir, resultPath).replaceAll("\\", "/")}\`` : agent.result_captured_at ? "missing" : "not captured",
      summary: parsed.Summary ?? (agent.result_captured_at ? "result captured but missing result.md" : "no result yet"),
      files: compactList([parsed["Files changed"], parsed["Artifacts updated"]]),
      tests: parsed.Tests ?? "not recorded",
      blockers: parsed.Blockers ?? "not recorded",
      handoff: parsed.Handoff ?? "not recorded"
    });
  }
  return rows;
}

async function buildArtifactRows(names) {
  const rows = [];
  for (const name of names) {
    const target = path.join(artifactsDir, name);
    const info = await stat(target).catch(() => null);
    const content = await readFile(target, "utf8").catch(() => "");
    rows.push({
      name,
      status: content.trim().length < 40 ? "thin" : "ready",
      bytes: info?.size ?? 0,
      summary: firstContentLine(content)
    });
  }
  return rows;
}

async function readArchiveAudit(target) {
  const empty = { status: "", reason: "", commit: "", selectedPaths: [], unselectedChanges: [] };
  if (!existsSync(target)) return empty;
  const content = await readFile(target, "utf8");
  return {
    status: readListValue(content, "status"),
    reason: readListValue(content, "reason"),
    commit: readListValue(content, "commit"),
    selectedPaths: readSectionBullets(content, "Selected staged paths"),
    unselectedChanges: readSectionBullets(content, "Unselected new changes")
  };
}

function parseAgentResult(content) {
  const labels = ["Agent", "Status", "Summary", "Files changed", "Artifacts updated", "Tests", "Blockers", "Handoff"];
  const result = {};
  let current = "";
  for (const line of String(content ?? "").split(/\r?\n/)) {
    const match = labels.find((label) => line.startsWith(`${label}:`));
    if (match) {
      current = match;
      result[current] = line.slice(match.length + 1).trim();
      continue;
    }
    if (current && line.trim()) {
      result[current] = [result[current], line.trim()].filter(Boolean).join("<br>");
    }
  }
  return result;
}

function parseAgentResultJson(value) {
  return {
    Agent: value.agent,
    Status: value.status,
    Summary: value.summary,
    "Files changed": listText(value.filesChanged ?? value.fileChanges),
    "Artifacts updated": listText(value.artifactsUpdated ?? value.artifactUpdates),
    Tests: listText(value.tests),
    Blockers: listText(value.blockers),
    Handoff: value.handoff
  };
}

function listText(value) {
  if (!value) return "";
  if (!Array.isArray(value)) return String(value);
  return value.map((item) => {
    if (typeof item === "string") return item;
    return item.path ?? item.name ?? JSON.stringify(item);
  }).join("<br>");
}

function deliveryStatusFor({ state, archiveAudit, agentRows, artifactRows }) {
  if (archiveAudit.status === "committed") return "closed";
  if (state.status === "done" || state.stage === "done") return "done-not-archived";
  if (agentRows.some((item) => /blocked/i.test(item.status) || /blocked/i.test(item.blockers))) return "blocked";
  if (artifactRows.length > 0 || agentRows.length > 0) return "in-progress";
  return "not-started";
}

function buildContextBudgetRows(budget) {
  return (budget?.agents ?? []).map((item) => ({
    agent: item.agent,
    mode: item.mode,
    candidateFiles: item.candidateFiles ?? 0,
    includedFiles: item.includedFiles ?? 0,
    includedBytes: item.includedBytes ?? 0,
    estimatedTokens: item.estimatedTokens ?? 0,
    reasons: (item.reasons ?? []).join("<br>") || "-"
  }));
}

function buildTokenRows(ledger) {
  return Object.entries(ledger?.byKind ?? {}).map(([kind, item]) => ({
    kind,
    files: item.files ?? 0,
    chars: item.chars ?? 0,
    estimatedTokens: item.estimatedTokens ?? 0,
    bytes: item.bytes ?? 0
  }));
}

function contextBudgetTotal(budget) {
  const total = (budget?.agents ?? []).reduce((sum, item) => sum + Number(item.estimatedTokens ?? 0), 0);
  return total || "not generated";
}

function renderContextBudgetRow(item) {
  return `| \`${item.agent}\` | ${cell(item.mode)} | ${item.candidateFiles} | ${item.includedFiles} | ${item.includedBytes} | ${item.estimatedTokens} | ${cell(item.reasons)} |`;
}

function renderTokenRow(item) {
  return `| ${cell(item.kind)} | ${item.files} | ${item.chars} | ${item.estimatedTokens} | ${item.bytes} |`;
}

function verdictTagFor({ deliveryStatus }) {
  if (deliveryStatus === "closed") return "closed";
  if (deliveryStatus === "done-not-archived") return "done-not-archived";
  if (deliveryStatus === "blocked") return "blocked";
  if (deliveryStatus === "in-progress") return "in-progress";
  return "not-started";
}

function verdictFor({ deliveryStatus, archiveAudit, agentRows, artifactRows }) {
  if (deliveryStatus === "closed") return `This run is fully closed and archived: ${archiveAudit.commit || "commit not recorded"}.`;
  if (deliveryStatus === "done-not-archived") return "This run reached done, but archive commit is still pending.";
  if (deliveryStatus === "blocked") return "This run contains a blocker. Resolve agent output or manual confirmation before continuing.";
  if (agentRows.length === 0 && artifactRows.length === 0) return "This run has no deliverables yet. Execute the plan, implement, verify, or capture agent results first.";
  return "This run has partial results, but it is not fully closed yet.";
}

function readListValue(content, key) {
  const pattern = new RegExp(`^-\\s+${escapeRegExp(key)}:\\s*(.*)$`, "m");
  return pattern.exec(content)?.[1]?.trim() ?? "";
}

function readSectionBullets(content, heading) {
  const section = sectionText(content, heading);
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function sectionText(content, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(content);
  if (!match) return "";
  const rest = content.slice(match.index + match[0].length);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

async function readJson(target, fallback) {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function renderAgentRow(item) {
  return `| \`${item.agent}\` | ${cell(item.type)} | ${cell(item.status)} | ${cell(item.resultFile)} | ${cell(item.summary)} | ${cell(item.files)} | ${cell(item.tests)} | ${cell(item.blockers)} | ${cell(item.handoff)} |`;
}

function firstContentLine(content) {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) ?? "empty";
}

function firstLines(content, limit) {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join("\n");
}

function blockquote(content) {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function compactList(items) {
  return items.filter(Boolean).join("<br>") || "not recorded";
}

function resolveWorkspacePath(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

function inferAgentType(agent) {
  if (["pm", "requirements", "architect", "reviewer", "release", "tester"].includes(agent)) return "core";
  if (["frontend", "docs", "backend", "database", "devops"].includes(agent)) return "implementation";
  return "other";
}

function cell(value) {
  const text = String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
  return text.length > 320 ? `${text.slice(0, 320)}...` : text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
