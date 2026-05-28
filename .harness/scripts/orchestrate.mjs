import { mkdir, readFile, readdir, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { decideContextMode } from "./lib/context-mode.mjs";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { loadProjectOverlay, renderOverlayContext } from "./lib/project-overlay.mjs";
import {
  renderArtifactOverview,
  stripSkillCandidateBlocks,
  summarizeArtifactRecord
} from "./lib/artifact-summary.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const applyCode = args.includes("--apply-code");
const approveRisk = args.includes("--approve-risk");
const applyArtifacts = !args.includes("--no-apply-artifacts");
const selectedAgentsArg = args.find((arg) => arg.startsWith("--agents="));
const selectedAgents = selectedAgentsArg
  ? new Set(selectedAgentsArg.replace("--agents=", "").split(",").map((item) => item.trim()).filter(Boolean))
  : null;

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:orchestrate -- 2026-05-14-001-blog-mvp --dry-run");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const tasksDir = path.join(runDir, "tasks");
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");
const agentLogsDir = path.join(logsDir, "agents");
const backupDir = path.join(logsDir, "backups", new Date().toISOString().replace(/[:.]/g, "-"));
const statusPath = path.join(logsDir, "orchestrate-status.json");

if (!existsSync(runDir)) fail(`run 不存在：${path.relative(root, runDir)}`);
if (!existsSync(tasksDir)) fail(`缺少 tasks/，请先执行：npm run harness:prepare-run -- ${runId}`);
if (!dryRun && !process.env.OPENAI_API_KEY) fail("缺少 OPENAI_API_KEY。真实多 agent 执行需要 OpenAI API Key；只预览可加 --dry-run。");

const AgentOutput = z.object({
  agent: z.string(),
  status: z.enum(["completed", "blocked", "needs_input"]),
  summary: z.string(),
  artifactUpdates: z.array(z.object({
    path: z.string(),
    content: z.string()
  })).default([]),
  fileChanges: z.array(z.object({
    path: z.string(),
    mode: z.enum(["create", "update", "delete"]).default("update"),
    reason: z.string(),
    content: z.string().default("")
  })).default([]),
  recommendedCodeChanges: z.array(z.object({
    path: z.string(),
    reason: z.string(),
    change: z.string()
  })).default([]),
  tests: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  handoff: z.string().default("")
});

const executionOrder = ["pm", "requirements", "architect", "frontend", "backend", "database", "devops", "tester", "reviewer", "release"];

await mkdir(agentLogsDir, { recursive: true });

const modelPolicy = await readYaml(".harness/config/model-policy.yaml");
const writePolicy = await readYaml(".harness/config/write-policy.yaml");
const riskPolicy = await readYaml(".harness/config/risk-policy.yaml");
const budgetPolicy = await readYaml(".harness/config/budget-policy.yaml");
const contextPolicy = await readYaml(".harness/config/context-policy.yaml");
const { source: projectProfileSource, project_profile: projectProfileConfig } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfileConfig.ai_overlay?.profile, { projectProfile: projectProfileConfig });
const globalRules = await readOptional(".harness/AGENTS.md");
const skillsConfig = await readYaml(".harness/config/skills.yaml");
const input = await readOptional(path.join(".harness", "runs", runId, "input.md"));
const promptBudgets = contextPolicy.context?.prompt_budgets ?? {};
const writeEnabledAgents = new Set(writePolicy.code_write?.write_enabled_agents ?? []);
const artifactOwners = {
  "requirement-interview.md": new Set(["requirements-interview", "requirements-plan", "requirements"]),
  "requirement-plan.md": new Set(["requirements-plan"]),
  "requirement.md": new Set(["pm", "requirements", "requirements-plan"]),
  "architecture.md": new Set(["architect"]),
  "implementation-plan.md": new Set(["architect"]),
  "api-change.md": new Set(["backend"]),
  "db-migration.md": new Set(["database"]),
  "test-report.md": new Set(["frontend", "backend", "database", "devops", "tester"]),
  "review-report.md": new Set(["reviewer"]),
  "release-summary.md": new Set(["release", "devops"]),
  "blockers.md": new Set(["pm", "requirements-plan", "requirements", "architect", "frontend", "backend", "database", "devops", "tester", "reviewer", "release"])
};

const taskFiles = (await readdir(tasksDir))
  .filter((name) => name.endsWith(".task.md"))
  .sort((a, b) => executionOrder.indexOf(a.replace(".task.md", "")) - executionOrder.indexOf(b.replace(".task.md", "")));

const selectedTaskFiles = [];
for (const fileName of taskFiles) {
  const agentId = fileName.replace(".task.md", "");
  if (!selectedAgents || selectedAgents.has(agentId)) selectedTaskFiles.push(fileName);
}

const maxAgents = budgetPolicy.budget?.max_agents_per_run ?? 10;
if (selectedTaskFiles.length > maxAgents) {
  fail(`本次计划执行 ${selectedTaskFiles.length} 个 agent，超过预算限制 ${maxAgents}。`);
}

const plannedTasks = [];
const results = [];
const runtimeStatus = {
  runId,
  status: "planning",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  finishedAt: null,
  applyCode,
  approveRisk,
  agents: {}
};

for (const fileName of selectedTaskFiles) {
  const agentId = fileName.replace(".task.md", "");
  const taskPath = path.join(tasksDir, fileName);
  const task = await readFile(taskPath, "utf8");
  const allowedPatterns = extractAllowedPatterns(task);
  const profile = resolveProfile(modelPolicy, agentId);
  const context = await buildAgentContext(agentId, { task, allowedPatterns });
  const canWriteCode = writeEnabledAgents.has(agentId);

  plannedTasks.push({
    agent: agentId,
    model: profile.model,
    reasoning_effort: profile.reasoning_effort,
    can_write_code: canWriteCode,
    code_writes_apply: canWriteCode && applyCode,
    risk_approved: approveRisk,
    task: path.relative(root, taskPath).replaceAll("\\", "/"),
    allowed_patterns: allowedPatterns
  });

  runtimeStatus.agents[agentId] = {
    agent: agentId,
    status: "pending",
    model: profile.model,
    reasoning_effort: profile.reasoning_effort,
    can_write_code: canWriteCode,
    code_writes_apply: canWriteCode && applyCode,
    risk_approved: approveRisk,
    startedAt: null,
    endedAt: null,
    durationMs: null,
    summary: "",
    blockers: [],
    fileChanges: 0,
    appliedFileChanges: 0,
    artifactUpdates: 0,
    error: ""
  };

  if (dryRun) continue;

  const startedAt = Date.now();
  updateAgent(agentId, { status: "running", startedAt: new Date(startedAt).toISOString() });
  await writeRuntimeStatus();

  try {
    const output = await runAgent({ agentId, profile, task, context, canWriteCode, allowedPatterns });
    results.push(output);
    const codeWriteLog = await persistAgentOutput(agentId, output, { canWriteCode, allowedPatterns });
    const endedAt = Date.now();
    updateAgent(agentId, {
      status: output.status,
      endedAt: new Date(endedAt).toISOString(),
      durationMs: endedAt - startedAt,
      summary: output.summary,
      blockers: output.blockers ?? [],
      fileChanges: (output.fileChanges ?? []).length,
      appliedFileChanges: codeWriteLog.filter((item) => item.applied).length,
      artifactUpdates: (output.artifactUpdates ?? []).length
    });
  } catch (error) {
    const endedAt = Date.now();
    updateAgent(agentId, {
      status: "blocked",
      endedAt: new Date(endedAt).toISOString(),
      durationMs: endedAt - startedAt,
      summary: "执行失败",
      blockers: [String(error?.message ?? error)],
      error: String(error?.stack ?? error)
    });
  }

  await writeRuntimeStatus();
}

if (dryRun) {
  const planPath = path.join(logsDir, "orchestrate-plan.json");
  await writeFile(planPath, `${JSON.stringify({ runId, dryRun: true, applyCode, approveRisk, plannedTasks }, null, 2)}\n`, "utf8");
  runtimeStatus.status = "dry-run";
  runtimeStatus.finishedAt = new Date().toISOString();
  await writeRuntimeStatus();
  console.log(`多 agent 执行计划已生成：${path.relative(root, planPath)}`);
  console.log(`计划执行 ${plannedTasks.length} 个 agent。`);
  process.exit(0);
}

const summary = await runMainSummary(results);
await writeFile(path.join(logsDir, "main-agent-summary.md"), ensureTrailingNewline(summary), "utf8");
await writeFile(path.join(logsDir, "orchestrate-results.json"), `${JSON.stringify({ runId, applyCode, approveRisk, results }, null, 2)}\n`, "utf8");
runtimeStatus.status = "completed";
runtimeStatus.finishedAt = new Date().toISOString();
await writeRuntimeStatus();

console.log(`真实多 agent 执行完成：${runId}`);
console.log(`agent 日志：${path.relative(root, agentLogsDir)}`);

async function runAgent({ agentId, profile, task, context, canWriteCode, allowedPatterns }) {
  const { Agent, run } = await import("@openai/agents");
  const codeWriteInstruction = canWriteCode
    ? [
        "你是开发类 agent，可以在 fileChanges 中返回需要写入的文件。",
        "fileChanges 只能使用 task 的允许修改路径，必须返回完整文件内容。",
        `本 agent 允许修改路径：${allowedPatterns.join(", ") || "无"}`,
        applyCode ? "本次启用 --apply-code，符合策略的 fileChanges 会被落盘。" : "本次未启用 --apply-code，fileChanges 只会记录。"
      ].join("\n")
    : "你不是开发类 agent，必须保持 fileChanges 为空；只能输出 artifactUpdates、建议和交接。";

  const agent = new Agent({
    name: `${agentId} agent`,
    model: profile.model,
    modelSettings: { reasoning: { effort: profile.reasoning_effort } },
    outputType: AgentOutput,
    instructions: [
      "你是项目 harness 中的一个独立子 agent。",
      "你拥有独立上下文，只处理当前 task 指定的职责范围。",
      "如果需要人工确认或缺少上下文，把 status 设为 needs_input 或 blocked。",
      "所有输出必须使用中文。",
      codeWriteInstruction,
      context.instructions
    ].join("\n\n")
  });

  const result = await run(agent, [
    "请执行下面的 agent task，并返回结构化结果。",
    "",
    "## 当前 run 输入",
    limitText(stripSkillCandidateBlocks(input), promptBudgets.run_input_chars ?? 1600),
    "",
    "## Agent task",
    limitText(task, promptBudgets.task_chars ?? 2600),
    "",
    "## 可用上下文",
    context.body
  ].join("\n"));

  return result.finalOutput;
}

async function runMainSummary(agentResults) {
  const { Agent, run } = await import("@openai/agents");
  const profile = resolveProfile(modelPolicy, "main");
  const mainAgent = new Agent({
    name: "main orchestrator agent",
    model: profile.model,
    modelSettings: { reasoning: { effort: profile.reasoning_effort } },
    instructions: "你是主 agent，请用中文 Markdown 汇总各子 agent 状态、阻塞点、已落盘或建议代码变更、artifact 更新和下一步。"
  });
  const result = await run(mainAgent, JSON.stringify(agentResults, null, 2));
  return result.finalOutput;
}

async function persistAgentOutput(agentId, output, { canWriteCode, allowedPatterns }) {
  await enforceAgentBudget(agentId, output);
  await writeFile(path.join(agentLogsDir, `${agentId}.json`), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeFile(path.join(agentLogsDir, `${agentId}.md`), renderAgentMarkdown(output), "utf8");

  const artifactWriteLog = [];
  if (applyArtifacts) {
    for (const update of output.artifactUpdates ?? []) {
      const decision = resolveArtifactWrite(agentId, update);
      artifactWriteLog.push(decision.log);
      if (decision.target) await writeFile(decision.target, ensureTrailingNewline(update.content), "utf8");
    }
  }
  if (artifactWriteLog.length > 0) {
    await writeFile(path.join(agentLogsDir, `${agentId}.artifact-writes.json`), `${JSON.stringify(artifactWriteLog, null, 2)}\n`, "utf8");
  }

  const codeWriteLog = [];
  for (const change of output.fileChanges ?? []) {
    codeWriteLog.push(await applyFileChange(agentId, change, { canWriteCode, allowedPatterns }));
  }

  if (codeWriteLog.length > 0) {
    await writeFile(path.join(agentLogsDir, `${agentId}.code-writes.json`), `${JSON.stringify(codeWriteLog, null, 2)}\n`, "utf8");
  }

  return codeWriteLog;
}

function updateAgent(agentId, patch) {
  runtimeStatus.agents[agentId] = {
    ...(runtimeStatus.agents[agentId] ?? { agent: agentId }),
    ...patch
  };
  runtimeStatus.updatedAt = new Date().toISOString();
  const values = Object.values(runtimeStatus.agents);
  if (values.some((item) => item.status === "running")) {
    runtimeStatus.status = "running";
  } else if (values.some((item) => item.status === "blocked")) {
    runtimeStatus.status = "blocked";
  } else if (values.some((item) => item.status === "pending")) {
    runtimeStatus.status = "planning";
  }
}

async function writeRuntimeStatus() {
  await writeFile(statusPath, `${JSON.stringify(runtimeStatus, null, 2)}\n`, "utf8");
  await refreshDashboard();
}

function refreshDashboard() {
  return new Promise((resolve) => {
    const script = path.join(root, ".harness", "scripts", "dashboard.mjs");
    const child = spawn(process.execPath, [script], {
      cwd: root,
      stdio: "ignore",
      env: { ...process.env, HARNESS_DASHBOARD_QUIET: "1" }
    });
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}

async function enforceAgentBudget(agentId, output) {
  const maxFileChanges = budgetPolicy.budget?.max_file_changes_per_agent ?? 20;
  const maxArtifactUpdates = budgetPolicy.budget?.max_artifact_updates_per_agent ?? 8;
  if ((output.fileChanges ?? []).length > maxFileChanges) fail(`${agentId} fileChanges 超过限制：${maxFileChanges}`);
  if ((output.artifactUpdates ?? []).length > maxArtifactUpdates) fail(`${agentId} artifactUpdates 超过限制：${maxArtifactUpdates}`);
}

async function applyFileChange(agentId, change, { canWriteCode, allowedPatterns }) {
  const relPath = normalizeRelPath(change.path);
  const target = path.resolve(root, relPath);
  const risk = detectRisk(relPath, change.content ?? "");
  const base = {
    agent: agentId,
    path: relPath,
    mode: change.mode,
    applied: false,
    risk,
    beforeHash: null,
    afterHash: null,
    backup: null,
    reason: ""
  };

  if (!applyCode) return { ...base, reason: "未启用 --apply-code，仅记录 fileChanges。" };
  if (!canWriteCode) return { ...base, reason: "该 agent 不在 code_write.write_enabled_agents 白名单中。" };
  if (!isPathAllowed(relPath, allowedPatterns)) return { ...base, reason: "目标路径不在该 agent task 的允许修改范围内。" };
  if (isProtectedPath(relPath)) return { ...base, reason: "目标路径命中 protected_paths，禁止写入。" };
  if (risk.high && !approveRisk) return { ...base, reason: "命中高风险路径或内容，缺少 --approve-risk。" };
  if (change.mode === "delete") return { ...base, reason: "当前版本不允许子 agent 删除文件。" };
  if (!change.content || change.content.trim().length === 0) return { ...base, reason: "缺少完整文件内容，拒绝写入。" };
  if (!target.startsWith(root + path.sep)) return { ...base, reason: "目标路径越出项目根目录，拒绝写入。" };

  await mkdir(path.dirname(target), { recursive: true });
  let beforeHash = null;
  let backup = null;
  if (existsSync(target)) {
    const before = await readFile(target);
    beforeHash = hash(before);
    backup = path.join(backupDir, relPath);
    await mkdir(path.dirname(backup), { recursive: true });
    await copyFile(target, backup);
  }

  await writeFile(target, ensureTrailingNewline(change.content), "utf8");
  const afterHash = hash(await readFile(target));
  return {
    ...base,
    applied: true,
    beforeHash,
    afterHash,
    backup: backup ? path.relative(root, backup).replaceAll("\\", "/") : null,
    reason: change.reason || "已按子 agent fileChanges 写入。"
  };
}

function detectRisk(relPath, content) {
  const pathPatterns = riskPolicy.risk?.high_risk_path_patterns ?? [];
  const contentPatterns = riskPolicy.risk?.high_risk_content_patterns ?? [];
  const pathHits = pathPatterns.filter((pattern) => matchPattern(relPath, normalizeRelPath(pattern)));
  const upperContent = content.toUpperCase();
  const contentHits = contentPatterns.filter((pattern) => upperContent.includes(String(pattern).toUpperCase()));
  return { high: pathHits.length > 0 || contentHits.length > 0, pathHits, contentHits };
}

function renderAgentMarkdown(output) {
  const artifactUpdates = (output.artifactUpdates ?? []).map((item) => `- ${item.path}`).join("\n") || "- 无";
  const fileChanges = (output.fileChanges ?? []).map((item) => `- ${item.path}: ${item.reason}`).join("\n") || "- 无";
  const codeChanges = (output.recommendedCodeChanges ?? []).map((item) => `- ${item.path}: ${item.reason}\n\n${item.change}`).join("\n\n") || "- 无";
  const tests = (output.tests ?? []).map((item) => `- ${item}`).join("\n") || "- 无";
  const blockers = (output.blockers ?? []).map((item) => `- ${item}`).join("\n") || "- 无";
  return `# ${output.agent} agent 执行结果

## 状态

${output.status}

## 摘要

${output.summary}

## Artifact 更新

${artifactUpdates}

## 文件写入请求

${fileChanges}

## 建议代码变更

${codeChanges}

## 测试建议或结果

${tests}

## 阻塞点

${blockers}

## 交接

${output.handoff || "无"}
`;
}

async function buildAgentContext(agentId, { task, allowedPatterns }) {
  const agentDoc = await readOptional(path.join(".harness", "agents", `${agentId}.md`));
  const ruleDoc = await readOptional(path.join(".harness", "rules", `${agentId}.md`));
  const contextPack = await readOptional(path.join(".harness", "runs", runId, "logs", "context", `${agentId}.md`));
  const artifactIndex = await readOptional(path.join(".harness", "runs", runId, "logs", "context", "artifact-index.md"));
  const impactScopes = extractImpactScopes(task);
  const projectOverlayContext = await renderOverlayContext(root, projectOverlay, agentId, {
    maxChars: promptBudgets.project_overlay_chars ?? 4000,
    allowedPatterns,
    taskText: task,
    runInput: input,
    impactScopes
  });
  const skillContext = renderSkillContext(skillsConfig, agentId);
  const contextDecision = decideContextMode({
    agentId,
    task,
    runInput: input,
    allowedPatterns,
    policy: contextPolicy.context ?? {}
  });
  const contextBudget = contextDecision.mode === "full"
    ? promptBudgets.full_context_chars ?? 12000
    : contextDecision.mode === "targeted"
      ? promptBudgets.targeted_context_chars ?? 5000
      : promptBudgets.context_pack_chars ?? 2500;
  const instructions = [
    limitText(globalRules, promptBudgets.role_rules_chars ?? 900),
    limitText(summarizeMarkdown(agentDoc), promptBudgets.role_rules_chars ?? 900),
    limitText(summarizeMarkdown(ruleDoc), promptBudgets.role_rules_chars ?? 900)
  ].filter(Boolean).join("\n\n");
  return {
    instructions,
    body: [
      "## 上下文模式",
      `- mode: ${contextDecision.mode}`,
      `- reasons: ${contextDecision.reasons.join("; ")}`,
      "",
      "## 技能策略",
      limitText(skillContext, promptBudgets.skill_context_chars ?? 700),
      "",
      "## 项目 Overlay",
      limitText(projectOverlayContext, promptBudgets.project_overlay_chars ?? 4000),
      "",
      "## 产物索引",
      limitText(artifactIndex || "尚未生成产物索引。请运行 `npm run harness:context-pack -- <runId>`。", promptBudgets.artifact_index_chars ?? 2600),
      "",
      "## 上下文包",
      contextDecision.mode === "light"
        ? limitText(summarizeContextPack(contextPack), contextBudget)
        : limitText(contextPack, contextBudget)
    ].join("\n")
  };
}

async function readArtifacts() {
  const artifactNames = ["requirement.md", "architecture.md", "implementation-plan.md", "api-change.md", "db-migration.md", "test-report.md", "review-report.md", "release-summary.md"];
  const records = [];
  for (const [index, name] of artifactNames.entries()) {
    const content = await readOptional(path.join(".harness", "runs", runId, "artifacts", name));
    if (!content) continue;
    records.push(summarizeArtifactRecord({
      name,
      status: content.trim().length < 40 ? "thin" : "ready",
      bytes: Buffer.byteLength(content),
      content: stripSkillCandidateBlocks(content),
      maxChars: 350,
      maxHeadings: 8,
      priority: index
    }));
  }
  if (!records.length) return "";
  return renderArtifactOverview(records, {
    title: "Run Artifact 总览",
    intro: "主 agent 优先看总览，再按需展开具体文档。",
    includeCards: true
  }).trim();
}

function resolveProfile(policy, agentId) {
  const agentPolicy = policy.agent_model_policy?.[agentId] ?? policy.agent_model_policy?.main;
  const profileName = agentPolicy?.profile ?? "standard_analysis";
  const profile = policy.model_profiles?.[profileName] ?? policy.model_profiles?.standard_analysis;
  return { profile: profileName, model: profile?.model ?? "gpt-5.4", reasoning_effort: profile?.reasoning_effort ?? "medium" };
}

function extractAllowedPatterns(task) {
  const lines = task.split(/\r?\n/);
  const patterns = [];
  let inAllowed = false;
  for (const line of lines) {
    if (line.startsWith("## ") && /允许修改|Allowed Write Scope|Allowed/i.test(line)) {
      inAllowed = true;
      continue;
    }
    if (inAllowed && line.startsWith("## ")) break;
    if (inAllowed && line.trim().startsWith("- ")) patterns.push(line.trim().slice(2).trim());
  }
  return patterns.map(normalizeRelPath).filter(Boolean);
}

function extractImpactScopes(task) {
  const line = task.split(/\r?\n/).find((item) => item.trim().startsWith("- impact_scopes:"));
  if (!line) return [];
  return line
    .split(":")
    .slice(1)
    .join(":")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "(none)");
}

function isPathAllowed(relPath, allowedPatterns) {
  return allowedPatterns.some((pattern) => matchPattern(relPath, pattern));
}

function matchPattern(relPath, pattern) {
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return relPath === prefix || relPath.startsWith(`${prefix}/`);
  }
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("\\*\\*", ".*").replaceAll("\\*", "[^/]*");
    return new RegExp(`^${escaped}$`).test(relPath);
  }
  return relPath === pattern;
}

function isProtectedPath(relPath) {
  return (writePolicy.code_write?.protected_paths ?? []).some((pattern) => matchPattern(relPath, normalizeRelPath(pattern)));
}

function renderSkillContext(config, agentId) {
  const roleSkills = config?.role_skills ?? config?.skills ?? {};
  const commonSkills = roleSkills.common ?? [];
  const agentSkills = roleSkills[agentId] ?? [];
  const skillPolicy = contextPolicy.context?.skill_context ?? {};
  const labels = [...new Set([...commonSkills, ...agentSkills])].slice(0, skillPolicy.max_role_labels ?? 12);
  const candidates = Object.entries(config?.external_skill_candidates ?? {})
    .filter(([, item]) => (item.roles ?? []).includes(agentId))
    .map(([name, item]) => {
      const skillFile = path.join(root, ".agents", "skills", name, "SKILL.md");
      const status = existsSync(skillFile) ? "installed" : (item.status ?? "candidate");
      const parts = [`- ${name}: ${status}`];
      if (skillPolicy.include_installed_paths && existsSync(skillFile)) parts.push(`  path: .agents/skills/${name}/SKILL.md`);
      if (skillPolicy.include_install_commands && item.install_command) parts.push(`  install: ${item.install_command}`);
      return parts.join("\n");
    });

  return [
    "以下引用只是能力提示，不代表技能已经启用。",
    "请用 `npx skills list --json` 确认可用项目技能；只有相关时才读取 SKILL.md。",
    ["", "角色标签：", ...labels.map((item) => `- ${item}`)].join("\n"),
    skillPolicy.include_external_candidates !== false && candidates.length ? ["", "外部候选技能：", ...candidates].join("\n") : ""
  ].filter(Boolean).join("\n");
}

function summarizeMarkdown(markdown) {
  if (!markdown) return "";
  const kept = [];
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("- ") || /^\d+\./.test(trimmed)) kept.push(line);
    if (kept.length >= 30) break;
  }
  return kept.join("\n");
}

function summarizeContextPack(contextPack) {
  if (!contextPack) return "";
  const kept = [];
  for (const line of contextPack.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("- ")) kept.push(line);
    if (kept.length >= 60) break;
  }
  return kept.join("\n");
}

async function readYaml(relPath) {
  return parseYaml(await readFile(path.join(root, relPath), "utf8"));
}

async function readOptional(relOrAbsPath) {
  const target = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.join(root, relOrAbsPath);
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}

function resolveArtifactWrite(agentId, update) {
  const normalized = String(update.path ?? "").replaceAll("\\", "/");
  const artifactName = normalized.startsWith("artifacts/") ? normalized.replace("artifacts/", "") : path.basename(normalized);
  const allowedOwners = artifactOwners[artifactName];
  const base = {
    agent: agentId,
    path: normalized,
    artifact: artifactName,
    applied: false,
    reason: ""
  };

  if (!artifactName || artifactName.includes("/") || artifactName.includes("..")) {
    return { target: null, log: { ...base, reason: "artifact 路径非法，拒绝写入。" } };
  }
  if (!allowedOwners?.has(agentId)) {
    return { target: null, log: { ...base, reason: "该 agent 不拥有此 artifact 的写入权限。" } };
  }
  if (!update.content || update.content.trim().length < 20) {
    return { target: null, log: { ...base, reason: "artifact 内容过短或为空，拒绝写入。" } };
  }

  const target = safeArtifactPath(artifactName);
  if (!target) return { target: null, log: { ...base, reason: "artifact 路径越出 artifacts 目录，拒绝写入。" } };
  return { target, log: { ...base, applied: true, reason: "已按 artifact owner 白名单写入。" } };
}

function safeArtifactPath(targetPath) {
  const normalized = targetPath.replaceAll("\\", "/");
  const artifactName = normalized.startsWith("artifacts/") ? normalized.replace("artifacts/", "") : path.basename(normalized);
  const target = path.resolve(artifactsDir, artifactName);
  const artifactRoot = path.resolve(artifactsDir);
  if (!target.startsWith(artifactRoot + path.sep)) return null;
  return target;
}

function normalizeRelPath(inputPath) {
  return inputPath.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

function ensureTrailingNewline(content) {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function limitText(text, maxChars) {
  const value = String(text ?? "");
  return value.length > maxChars ? `${value.slice(0, maxChars)}\n\n...(已截断)` : value;
}
