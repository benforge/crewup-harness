import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadProjectProfile, productDocsPath } from "./lib/project-profile.mjs";

const root = process.cwd();
const dashboardDir = path.join(root, ".harness", "dashboard");
const dashboardPath = path.join(dashboardDir, "index.html");

await mkdir(dashboardDir, { recursive: true });

const { project_profile: projectProfile } = await loadProjectProfile(root);
const productDocsRel = productDocsPath(projectProfile);

const data = {
  generatedAt: new Date().toISOString(),
  runs: await readRuns(),
  productDocs: await readProductDocs()
};

await writeFile(dashboardPath, renderHtml(data), "utf8");
if (process.env.HARNESS_DASHBOARD_QUIET !== "1") {
  console.log(`Dashboard 已生成：${path.relative(root, dashboardPath)}`);
}

async function readRuns() {
  const runsDir = path.join(root, ".harness", "runs");
  if (!existsSync(runsDir)) return [];
  const entries = await readdir(runsDir, { withFileTypes: true });
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runId = entry.name;
    const runDir = path.join(runsDir, runId);
    const state = await readJsonOptional(path.join(runDir, "state.json"));
    const plan = await readJsonOptional(path.join(runDir, "logs", "orchestrate-plan.json"));
    const runtime = await readJsonOptional(path.join(runDir, "logs", "orchestrate-status.json"));
    const results = await readJsonOptional(path.join(runDir, "logs", "orchestrate-results.json"));
    const taskFiles = await listFiles(path.join(runDir, "tasks"), (name) => name.endsWith(".task.md"));
    const contextFiles = await listFiles(path.join(runDir, "logs", "context"), (name) => name.endsWith(".md"));
    const agentLogs = await listFiles(path.join(runDir, "logs", "agents"), (name) => name.endsWith(".md") || name.endsWith(".json"));
    const artifacts = await readArtifacts(runDir);
    const verify = await summarizeVerify(path.join(runDir, "artifacts", "test-report.md"));
    const native = await readJsonOptional(path.join(runDir, "logs", "native-subagents", "native-state.json"));

    runs.push({
      runId,
      state,
      plan,
      runtime,
      results,
      taskFiles,
      contextFiles,
      agentLogs,
      artifacts,
      verify,
      native
    });
  }
  return runs.sort((a, b) => b.runId.localeCompare(a.runId));
}

async function readProductDocs() {
  if (!productDocsRel) return [];
  const productDir = path.join(root, productDocsRel);
  if (!existsSync(productDir)) return [];
  const files = await walkMarkdown(productDir);
  const docs = [];
  for (const file of files) {
    const fileStat = await stat(file);
    docs.push({
      name: path.relative(productDir, file),
      href: path.relative(dashboardDir, file).replaceAll("\\", "/"),
      bytes: fileStat.size,
      updatedAt: fileStat.mtime.toISOString()
    });
  }
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function walkMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await walkMarkdown(target));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(target);
    }
  }
  return result;
}

async function readArtifacts(runDir) {
  const artifactsDir = path.join(runDir, "artifacts");
  const names = [
    "requirement.md",
    "architecture.md",
    "implementation-plan.md",
    "api-change.md",
    "db-migration.md",
    "test-report.md",
    "review-report.md",
    "release-summary.md"
  ];
  const placeholders = [
    "说明为什么要做这个需求",
    "一句话说明本次 run 要交付什么",
    "待 Architect Agent 补充",
    "待 Tester Agent 补充",
    "作为「」，我希望「」，以便「」"
  ];
  const result = [];
  for (const name of names) {
    const target = path.join(artifactsDir, name);
    if (!existsSync(target)) {
      result.push({ name, status: "missing", bytes: 0 });
      continue;
    }
    const content = await readFile(target, "utf8");
    const hasPlaceholder = placeholders.some((snippet) => content.includes(snippet));
    result.push({
      name,
      status: hasPlaceholder ? "placeholder" : content.trim().length < 40 ? "thin" : "ready",
      bytes: Buffer.byteLength(content)
    });
  }
  return result;
}

async function summarizeVerify(reportPath) {
  if (!existsSync(reportPath)) return { exists: false, passed: 0, failed: 0, skipped: 0 };
  const content = await readFile(reportPath, "utf8");
  return {
    exists: true,
    passed: count(content, "| passed |"),
    failed: count(content, "| failed |"),
    skipped: count(content, "| skipped |")
  };
}

async function listFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter(filter).sort();
}

async function readJsonOptional(target) {
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch {
    return null;
  }
}

function count(text, pattern) {
  return text.split(pattern).length - 1;
}

function renderHtml(payload) {
  const currentRun = payload.runs[0] ?? null;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="5">
  <title>Harness Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --panel: #ffffff;
      --ink: #1f2937;
      --muted: #6b7280;
      --line: #d8dee8;
      --green: #137a45;
      --red: #b42318;
      --amber: #9a6700;
      --blue: #285c9d;
      --shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
      background: var(--bg);
      color: var(--ink);
    }
    header {
      border-bottom: 1px solid var(--line);
      background: #ffffff;
      padding: 20px 28px;
    }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 650; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    h3 { margin: 0 0 8px; font-size: 15px; }
    .sub { color: var(--muted); font-size: 13px; }
    main { padding: 24px 28px 40px; max-width: 1440px; margin: 0 auto; }
    .grid { display: grid; gap: 16px; }
    .grid.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 16px;
    }
    .metric { font-size: 28px; font-weight: 700; }
    .muted { color: var(--muted); }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 24px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 12px;
      background: #f9fafb;
      white-space: nowrap;
    }
    .pill.green { color: var(--green); border-color: #a7d7bd; background: #effaf3; }
    .pill.red { color: var(--red); border-color: #f1b4ad; background: #fff3f1; }
    .pill.amber { color: var(--amber); border-color: #efd28a; background: #fff8db; }
    .pill.blue { color: var(--blue); border-color: #b9cff0; background: #f1f6ff; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-weight: 600; background: #fbfcfe; }
    .section { margin-top: 18px; }
    .list { display: flex; flex-wrap: wrap; gap: 8px; }
    .agent-row { display: grid; grid-template-columns: 140px 140px 130px 130px 1fr; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line); }
    .agent-row:last-child { border-bottom: 0; }
    .runtime-row { display: grid; grid-template-columns: 130px 110px 130px 120px 120px 1fr; gap: 10px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .runtime-row:last-child { border-bottom: 0; }
    .summary { color: var(--muted); line-height: 1.5; overflow-wrap: anywhere; }
    code { font-family: Consolas, "SFMono-Regular", monospace; font-size: 12px; }
    @media (max-width: 1000px) {
      .grid.cols-4, .grid.cols-3 { grid-template-columns: 1fr; }
      .agent-row, .runtime-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Harness Dashboard</h1>
    <div class="sub">生成时间：${escapeHtml(payload.generatedAt)}</div>
  </header>
  <main>
    ${renderRunOverview(payload.runs)}
    ${renderProductDocs(payload.productDocs)}
    ${currentRun ? renderRun(currentRun) : "<section class=\"panel section\"><h2>暂无 run</h2></section>"}
    ${renderRuns(payload.runs)}
  </main>
</body>
</html>`;
}

function renderRunOverview(runs) {
  const counts = countRunsByStatus(runs);
  return `<section class="grid cols-4">
    ${["active", "waiting_user", "blocked", "done", "canceled", "failed"].map((status) => `<div class="panel"><h3>${escapeHtml(status)}</h3><div class="metric">${counts[status] ?? 0}</div><div class="sub">runs</div></div>`).join("")}
  </section>`;
}

function countRunsByStatus(runs) {
  const result = {};
  for (const run of runs) {
    const status = run.state?.status ?? "unknown";
    result[status] = (result[status] ?? 0) + 1;
  }
  return result;
}

function renderProductDocs(productDocs) {
  const latest = productDocs.slice(0, 6);
  return `<section class="section panel">
    <h2>产品文档</h2>
    <table><thead><tr><th>文件</th><th>大小</th><th>更新时间</th></tr></thead><tbody>
      ${latest.map((doc) => `<tr>
        <td><a href="${escapeHtml(doc.href)}"><code>${escapeHtml(doc.name)}</code></a></td>
        <td>${doc.bytes}</td>
        <td>${escapeHtml(doc.updatedAt)}</td>
      </tr>`).join("") || "<tr><td colspan=\"3\" class=\"muted\">暂无产品文档</td></tr>"}
    </tbody></table>
  </section>`;
}

function renderRun(run) {
  const plan = run.plan?.plannedTasks ?? [];
  const writable = plan.filter((item) => item.can_write_code).length;
  const applying = plan.filter((item) => item.code_writes_apply).length;
  return `<section class="section panel">
    <h2>当前 Run：${escapeHtml(run.runId)}</h2>
    <div class="grid cols-4">
      <div><div class="metric">${run.taskFiles.length}</div><div class="sub">Tasks</div></div>
      <div><div class="metric">${plan.length}</div><div class="sub">计划 Agent</div></div>
      <div><div class="metric">${writable}</div><div class="sub">可写代码 Agent</div></div>
      <div><div class="metric">${applying}</div><div class="sub">本次启用写入</div></div>
    </div>
    <div class="section">${renderAgents(plan)}</div>
    <div class="section">${renderRuntime(run.runtime)}</div>
    <div class="section">${renderNative(run.native)}</div>
    <div class="section grid cols-3">
      <div>${renderArtifacts(run.artifacts)}</div>
      <div>${renderVerify(run.verify)}</div>
      <div>${renderLogs(run)}</div>
    </div>
  </section>`;
}

function renderAgents(agents) {
  if (!agents.length) return "<h3>Agent 计划</h3><p class=\"muted\">暂无 agent plan。</p>";
  return `<h3>Agent 计划</h3>
  <div>
    ${agents.map((agent) => `<div class="agent-row">
      <strong>${escapeHtml(agent.agent)}</strong>
      <span class="pill blue">${escapeHtml(agent.model)}</span>
      <span class="pill">${escapeHtml(agent.reasoning_effort)}</span>
      <span class="pill ${agent.can_write_code ? "green" : "amber"}">${agent.can_write_code ? "可写代码" : "不可写代码"}</span>
      <span class="pill ${agent.code_writes_apply ? "red" : "green"}">${agent.code_writes_apply ? "写入开启" : "只读/记录"}</span>
    </div>`).join("")}
  </div>`;
}

function renderRuntime(runtime) {
  if (!runtime) {
    return "<h3>运行态</h3><p class=\"muted\">暂无运行态数据。native/bridge result 写回后会生成。</p>";
  }
  const agents = Object.values(runtime.agents ?? {});
  const started = runtime.startedAt ? new Date(runtime.startedAt).getTime() : null;
  const finished = runtime.finishedAt ? new Date(runtime.finishedAt).getTime() : null;
  const totalMs = started ? ((finished ?? Date.now()) - started) : 0;
  return `<h3>运行态</h3>
  <div class="list" style="margin-bottom: 10px;">
    <span class="pill ${runtime.status === "completed" ? "green" : runtime.status === "blocked" ? "red" : runtime.status === "running" ? "blue" : "amber"}">${escapeHtml(runtime.status)}</span>
    <span class="pill">总耗时 ${formatDuration(totalMs)}</span>
    <span class="pill ${runtime.applyCode ? "red" : "green"}">${runtime.applyCode ? "允许写代码" : "不写代码"}</span>
    <span class="pill ${runtime.approveRisk ? "red" : "amber"}">${runtime.approveRisk ? "风险已审批" : "风险未审批"}</span>
    <span class="pill">更新时间 ${escapeHtml(runtime.updatedAt ?? "-")}</span>
  </div>
  <div>
    ${agents.map((agent) => `<div class="runtime-row">
      <strong>${escapeHtml(agent.agent)}</strong>
      ${runtimeStatusPill(agent.status)}
      <span class="pill blue">${escapeHtml(agent.model ?? "-")}</span>
      <span class="pill">耗时 ${formatDuration(agent.durationMs ?? durationFrom(agent.startedAt, agent.endedAt))}</span>
      <span class="pill ${agent.appliedFileChanges > 0 ? "red" : "green"}">写入 ${agent.appliedFileChanges ?? 0}/${agent.fileChanges ?? 0}</span>
      <div class="summary">${escapeHtml(shortText(agent.summary || agent.error || (agent.blockers ?? []).join("; ") || "-"))}</div>
    </div>`).join("")}
  </div>`;
}

function renderArtifacts(artifacts) {
  return `<div class="panel"><h3>Artifacts</h3>
    <table><thead><tr><th>文件</th><th>状态</th><th>大小</th></tr></thead><tbody>
    ${artifacts.map((item) => `<tr><td><code>${escapeHtml(item.name)}</code></td><td>${statusPill(item.status)}</td><td>${item.bytes}</td></tr>`).join("")}
    </tbody></table>
  </div>`;
}

function renderVerify(verify) {
  return `<div class="panel"><h3>Verify</h3>
    <div class="list">
      <span class="pill ${verify.exists ? "green" : "amber"}">${verify.exists ? "已生成" : "未生成"}</span>
      <span class="pill green">passed ${verify.passed}</span>
      <span class="pill red">failed ${verify.failed}</span>
      <span class="pill amber">skipped ${verify.skipped}</span>
    </div>
  </div>`;
}

function renderLogs(run) {
  return `<div class="panel"><h3>Logs</h3>
    <div class="list">
      <span class="pill blue">context ${run.contextFiles.length}</span>
      <span class="pill blue">agent logs ${run.agentLogs.length}</span>
      <span class="pill ${run.plan ? "green" : "amber"}">plan ${run.plan ? "yes" : "no"}</span>
      <span class="pill ${run.results ? "green" : "amber"}">results ${run.results ? "yes" : "no"}</span>
    </div>
  </div>`;
}

function renderNative(native) {
  if (!native) {
    return `<div class="panel"><h3>Native Subagents</h3><p class="muted">暂无 native state。</p></div>`;
  }
  const agents = native.agents ?? [];
  const retained = agents.filter((agent) => agent.status === "waiting_review" && agent.retention?.retain_after_result);
  return `<div class="panel"><h3>Native Subagents</h3>
    <div class="list" style="margin-bottom: 10px;">
      <span class="pill blue">planned ${agents.filter((agent) => agent.status === "planned").length}</span>
      <span class="pill blue">running ${agents.filter((agent) => agent.status === "running").length}</span>
      <span class="pill amber">waiting_review ${retained.length}</span>
      <span class="pill green">closed ${agents.filter((agent) => agent.status === "closed").length}</span>
    </div>
    <table><thead><tr><th>agent</th><th>status</th><th>handle</th><th>result</th><th>close</th></tr></thead><tbody>
      ${agents.map((agent) => `<tr>
        <td><code>${escapeHtml(agent.agent)}</code></td>
        <td>${escapeHtml(agent.status)}</td>
        <td>${escapeHtml(agent.handle ?? "-")}</td>
        <td>${escapeHtml(agent.result_status ?? "-")}</td>
        <td>${escapeHtml(agent.close_confirmed ? "closed" : agent.close_required ? "pending" : "n/a")}</td>
      </tr>`).join("")}
    </tbody></table>
  </div>`;
}

function renderRuns(runs) {
  return `<section class="section panel">
    <h2>Runs</h2>
    <table><thead><tr><th>runId</th><th>状态</th><th>阶段</th><th>tasks</th><th>context</th><th>agents</th></tr></thead><tbody>
      ${runs.map((run) => `<tr>
        <td><code>${escapeHtml(run.runId)}</code></td>
        <td>${escapeHtml(run.state?.status ?? "-")}</td>
        <td>${escapeHtml(run.state?.stage ?? "-")}</td>
        <td>${run.taskFiles.length}</td>
        <td>${run.contextFiles.length}</td>
        <td>${run.plan?.plannedTasks?.length ?? 0}</td>
      </tr>`).join("")}
    </tbody></table>
  </section>`;
}

function statusPill(status) {
  const cls = status === "ready" ? "green" : status === "missing" ? "red" : "amber";
  return `<span class="pill ${cls}">${escapeHtml(status)}</span>`;
}

function runtimeStatusPill(status) {
  const cls = status === "completed" ? "green" : status === "blocked" ? "red" : status === "running" ? "blue" : status === "needs_input" ? "amber" : "amber";
  return `<span class="pill ${cls}">${escapeHtml(status ?? "pending")}</span>`;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "-";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function durationFrom(startedAt, endedAt) {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return end - start;
}

function shortText(text) {
  const value = String(text).replace(/\s+/g, " ").trim();
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
