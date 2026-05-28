import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const runId = process.argv[2];

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:report -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs");
const nativeDir = path.join(logsDir, "native-subagents");

if (!existsSync(runDir)) {
  console.error(`run 不存在：${runId}`);
  process.exit(1);
}

const state = await readJson(path.join(runDir, "state.json"), {});
const taskNames = existsSync(tasksDir) ? (await readdir(tasksDir)).filter((name) => name.endsWith(".task.md")).sort() : [];
const artifactNames = existsSync(artifactsDir) ? (await readdir(artifactsDir)).sort() : [];
const nativeState = await readJson(path.join(nativeDir, "native-state.json"), null);
const changedFiles = await readJson(path.join(logsDir, "changed-files.json"), { files: [] });
const archiveAudit = await readArchiveAudit(path.join(logsDir, "archive", "git-commit.md"));

const agentRows = await buildAgentRows(nativeState, taskNames);
const artifactRows = await buildArtifactRows(artifactNames);

const lines = [
  `# Run 报告：${runId}`,
  "",
  `- 生成时间：${new Date().toISOString()}`,
  "",
  "## 概览",
  "",
  "| 项 | 值 |",
  "| --- | --- |",
  `| stage | ${cell(state.stage ?? "unknown")} |`,
  `| status | ${cell(state.status ?? "unknown")} |`,
  `| workflowProfile | ${cell(state.workflowProfile ?? "unknown")} |`,
  `| tasks | ${taskNames.length} |`,
  `| artifacts | ${artifactRows.length} |`,
  `| changed-files | ${(changedFiles.files ?? []).length} |`,
  `| archive git | ${cell(archiveAudit.status ? `${archiveAudit.status}${archiveAudit.reason ? `：${archiveAudit.reason}` : ""}` : "暂无记录")} |`,
  "",
  "## 子 Agent 结果",
  "",
  "| Agent | 类型 | 状态 | 结果文件 | 摘要 | 文件/产物 | 测试 | 阻塞 | Handoff |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...(agentRows.length ? agentRows.map(renderAgentRow) : ["| 暂无 | - | - | - | - | - | - | - | - |"]),
  "",
  "## 产物",
  "",
  "| 产物 | 状态 | 大小 | 摘要 |",
  "| --- | --- | ---: | --- |",
  ...(artifactRows.length ? artifactRows.map((item) => `| \`${item.name}\` | ${item.status} | ${item.bytes} | ${cell(item.summary)} |`) : ["| 暂无 | - | 0 | - |"]),
  "",
  "## 变更清单",
  "",
  "| 来源 | 数量 | 详情 |",
  "| --- | ---: | --- |",
  `| changed-files manifest | ${(changedFiles.files ?? []).length} | ${cell((changedFiles.files ?? []).join("<br>") || "无")} |`,
  `| archive selected paths | ${archiveAudit.selectedPaths.length} | ${cell(archiveAudit.selectedPaths.join("<br>") || "无")} |`,
  `| archive unselected changes | ${archiveAudit.unselectedChanges.length} | ${cell(archiveAudit.unselectedChanges.join("<br>") || "无")} |`,
  "",
  "## 归档与提交",
  "",
  "| 项 | 值 |",
  "| --- | --- |",
  `| archive status | ${cell(archiveAudit.status || "暂无记录")} |`,
  `| reason | ${cell(archiveAudit.reason || "无")} |`,
  `| commit | ${cell(archiveAudit.commit || "未生成")} |`,
  `| audit | ${existsSync(path.join(logsDir, "archive", "git-commit.md")) ? "`logs/archive/git-commit.md`" : "暂无"} |`,
  "",
  "## 结论",
  "",
  "如果 archive status 不是 `committed` 或 `skipped`，说明这条 run 还没有真正闭环到最终提交。",
  ""
];

const target = path.join(logsDir, "run-report.md");
await writeFile(target, `${lines.join("\n")}\n`, "utf8");
console.log(`Run 报告已写入：${path.relative(root, target).replaceAll("\\", "/")}`);

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
    const parsed = resultExists ? parseAgentResult(await readFile(resultPath, "utf8")) : {};
    rows.push({
      agent: agent.agent,
      type: agent.kind || agent.role || inferAgentType(agent.agent),
      status: [agent.status, agent.result_status ? `result=${agent.result_status}` : ""].filter(Boolean).join("<br>") || "planned",
      resultFile: resultExists ? `\`${path.relative(runDir, resultPath).replaceAll("\\", "/")}\`` : agent.result_captured_at ? "缺失" : "未捕获",
      summary: parsed.Summary ?? (agent.result_captured_at ? "结果已标记但缺少 result.md" : "尚无结果"),
      files: compactList([parsed["Files changed"], parsed["Artifacts updated"]]),
      tests: parsed.Tests ?? "未记录",
      blockers: parsed.Blockers ?? "未记录",
      handoff: parsed.Handoff ?? "未记录"
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
    selectedPaths: readSectionBullets(content, "选中暂存路径"),
    unselectedChanges: readSectionBullets(content, "未纳入的新增变更")
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
    return JSON.parse(await readFile(target, "utf8"));
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
    .find((line) => line && !line.startsWith("#")) ?? "空";
}

function compactList(items) {
  return items.filter(Boolean).join("<br>") || "未记录";
}

function resolveWorkspacePath(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

function inferAgentType(agent) {
  if (["pm", "requirements", "architect", "reviewer", "release", "tester"].includes(agent)) return "core";
  if (["frontend", "backend", "database", "devops"].includes(agent)) return "implementation";
  return "other";
}

function cell(value) {
  const text = String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
  return text.length > 320 ? `${text.slice(0, 320)}...` : text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
