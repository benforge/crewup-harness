import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { analyzeWorkload, renderWorkloadAnalysisMarkdown } from "./lib/workload-analysis.mjs";
import { resolveScriptPath } from "./lib/script-root.mjs";
import { isNativeAgentEnvironment, readAgentEnvironment } from "./lib/agent-runtime.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const text = valueOf("--text=") ?? positionalText();
const runIdArg = valueOf("--run=");
const profileArg = valueOf("--profile=") ?? "auto";
const agentsArg = valueOf("--agents=");
const skipRequirementsPlan = args.includes("--skip-requirements-plan");
const dryRun = args.includes("--dry-run");

if (!text?.trim() && !runIdArg) {
  console.error('请提供需求文本，例如：npm run harness:run -- "现在直接实现：给首页加一个搜索入口"');
  console.error("或继续已有 run：npm run harness:run -- --run=<run-id>");
  process.exit(1);
}

const summary = [];
const inputText = text?.trim() ?? "";
const analysis = analyzeWorkload(inputText, { requestedProfile: profileArg });

if (dryRun) {
  console.log(renderWorkloadAnalysisMarkdown(analysis));
  process.exit(0);
}

let runId = runIdArg;
let backlogFile = null;

if (!runId) {
  const intake = runJson("intake.mjs", ["--no-write", `--text=${inputText}`]);
  summary.push(`intake: ${intake.entry}`);

  if (intake.entry === "no_harness") {
    console.log("Intake 判定为 no_harness：无需创建 run。");
    console.log(JSON.stringify(intake, null, 2));
    process.exit(0);
  }

  const queue = intake.entry === "backlog_new" ? "new" : "ready";
  backlogFile = runText("backlog-item.mjs", [`--queue=${queue}`, `--text=${inputText}`]).trim().split(/\r?\n/).at(-1);
  summary.push(`backlog: ${backlogFile}`);

  if (intake.entry !== "direct_run") {
    await writeRunSummary(null, { summary, analysis, backlogFile });
    console.log(`已进入 backlog/${queue}，暂不创建 run：${backlogFile}`);
    console.log("当你确认开工时，再说“现在做/直接实现/开始开发”。");
    process.exit(0);
  }

  const readyFile = await ensureReadyBacklog(backlogFile);
  const output = runText("new-run.mjs", [path.basename(readyFile)]);
  runId = extractRunId(output);
  summary.push(`run: ${runId}`);
}

if (!runId || !existsSync(path.join(root, ".harness", "runs", runId))) {
  console.error(`run 不存在：${runId}`);
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
await mkdir(path.join(runDir, "logs"), { recursive: true });
await writeFile(path.join(runDir, "logs", "workload-analysis.md"), renderWorkloadAnalysisMarkdown(analysis), "utf8");
await writeFile(path.join(runDir, "logs", "workload-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");

runText("knowledge.mjs", []);
summary.push("knowledge: refreshed");

runText("knowledge-select.mjs", [runId]);
summary.push("knowledge-select: related-runs");

runText("prepare-run.mjs", [runId, `--profile=${analysis.workflowProfile}`]);
summary.push(`prepare-run: ${analysis.workflowProfile}`);

runText("spec-freeze.mjs", [runId]);
summary.push("spec-freeze: created");

if (analysis.needsRequirementsPlan && !skipRequirementsPlan) {
  runText("requirements-plan.mjs", [runId]);
  summary.push("requirements-plan: created");
}

const agents = agentsArg ?? await agentsFromTasks(runId);
if (agents) {
  runText("context-pack.mjs", [runId, `--agents=${agents}`]);
runText("native-plan.mjs", [runId, `--agents=${agents}`]);
summary.push(`native-plan: ${agents}`);

runText("token-ledger.mjs", [runId]);
summary.push("token-ledger: created");
}

await writeRunSummary(runId, { summary, analysis, backlogFile });

  console.log(`Harness run 已准备好：${runId}`);
  console.log(`- profile: ${analysis.workflowProfile}`);
  console.log(`- run_type: ${analysis.runType}`);
  console.log(`- complexity: ${analysis.complexityScore}/5 (${analysis.complexityLevel})`);
console.log(`- agents: ${agents || "(none)"}`);
const agentEnvironment = await readAgentEnvironment(root);
if (isNativeAgentEnvironment(agentEnvironment)) {
  console.log("下一步：主 agent 读取 native-subagent-plan.json，并按计划启动原生子 agent。");
} else {
  console.log("下一步：外部 agent 读取 agent-bridge/*.handoff.md，完成后写回对应 *.result.json。");
}

function runJson(script, scriptArgs) {
  const output = runText(script, scriptArgs);
  try {
    return JSON.parse(output);
  } catch (error) {
    console.error(output);
    throw error;
  }
}

function runText(script, scriptArgs) {
  const result = spawnSync(process.execPath, [resolveScriptPath(root, script), ...scriptArgs], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

async function ensureReadyBacklog(relPath) {
  const normalized = relPath.replaceAll("\\", "/");
  if (normalized.includes("/ready/")) return normalized.split("/ready/").at(-1);
  const source = path.join(root, normalized);
  const target = path.join(root, ".harness", "backlog", "ready", path.basename(normalized));
  if (!existsSync(source)) {
    console.error(`无法找到 backlog 文件：${normalized}`);
    process.exit(1);
  }
  const content = await readFile(source, "utf8");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content.replace(/- queue: .+/, "- queue: ready"), "utf8");
  summary.push(`ready: ${path.relative(root, target).replaceAll("\\", "/")}`);
  return path.basename(target);
}

function extractRunId(output) {
  const match = /Created run:\s+\.harness[\\/]runs[\\/](.+)$/m.exec(output);
  if (!match) {
    console.error(output);
    console.error("无法从 harness:new-run 输出中识别 runId。");
    process.exit(1);
  }
  return match[1].trim();
}

async function agentsFromTasks(currentRunId) {
  const tasksDir = path.join(root, ".harness", "runs", currentRunId, "tasks");
  const entries = await readdir(tasksDir, { withFileTypes: true }).catch(() => []);
  const agents = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".task.md"))
    .map((entry) => entry.name.replace(/\.task\.md$/, ""))
    .sort();
  return agents.join(",");
}

async function writeRunSummary(currentRunId, data) {
  const target = currentRunId
    ? path.join(root, ".harness", "runs", currentRunId, "logs", "harness-run.md")
    : path.join(root, ".harness", "reports", "last-harness-run.md");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, renderSummary(data), "utf8");
}

function renderSummary({ summary: items, analysis: workload, backlogFile: item }) {
  return [
    "# Harness Run 入口摘要",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- backlog: ${item ?? "无"}`,
    `- workflow_profile: ${workload.workflowProfile}`,
    `- run_type: ${workload.runType}`,
    `- complexity: ${workload.complexityScore}/5 (${workload.complexityLevel})`,
    "",
    "## 步骤",
    "",
    ...items.map((entry) => `- ${entry}`),
    "",
    "## 分析",
    "",
    ...workload.reasons.map((entry) => `- ${entry}`),
    ""
  ].join("\n");
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function positionalText() {
  return args.filter((arg) => !arg.startsWith("--")).join(" ").trim();
}

