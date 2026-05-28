import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { decideContextMode } from "./lib/context-mode.mjs";
import { loadProjectOverlay, renderOverlayContext } from "./lib/project-overlay.mjs";
import { sortByExecutionOrder } from "./lib/execution-order.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const selectedAgentsArg = args.find((arg) => arg.startsWith("--agents="));
const selectedAgents = selectedAgentsArg
  ? new Set(selectedAgentsArg.replace("--agents=", "").split(",").map((item) => item.trim()).filter(Boolean))
  : null;

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:native-plan -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs", "native-subagents");

if (!existsSync(tasksDir)) {
  console.error(`缺少 tasks/。请先运行：npm run harness:prepare-run -- ${runId}`);
  process.exit(1);
}

await mkdir(logsDir, { recursive: true });

const nativeConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "native-subagents.yaml"), "utf8")).native_subagents;
const modelPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "model-policy.yaml"), "utf8"));
const contextPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "context-policy.yaml"), "utf8")).context;
const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const runInput = await readOptional(path.join(runDir, "input.md"));
const artifactIndex = await readOptional(path.join(runDir, "logs", "context", "artifact-index.md"));
const taskFiles = (await readdir(tasksDir)).filter((name) => name.endsWith(".task.md")).sort();
const tasks = [];

for (const taskFile of taskFiles) {
  const agentId = taskFile.replace(".task.md", "");
  if (selectedAgents && !selectedAgents.has(agentId)) continue;

  const task = await readFile(path.join(tasksDir, taskFile), "utf8");
  const allowedPatterns = extractAllowedPatterns(task);
  const contextPack = await readOptional(path.join(runDir, "logs", "context", `${agentId}.md`));
  const impactScopes = extractImpactScopes(task);
  const projectOverlayContext = await renderOverlayContext(root, projectOverlay, agentId, {
    maxChars: contextPolicy.prompt_budgets?.native_overlay_chars ?? contextPolicy.prompt_budgets?.project_overlay_chars ?? 1200,
    allowedPatterns,
    taskText: task,
    runInput,
    impactScopes
  });
  const contextDecision = decideContextMode({
    agentId,
    task,
    runInput,
    allowedPatterns,
    policy: contextPolicy
  });
  const profile = resolveProfile(modelPolicy, agentId);
  const agentType = nativeConfig.agent_type_by_role?.[agentId] ?? "default";
  const spawnName = `${runId}:${agentId}`;
  const resultPath = `.harness/runs/${runId}/logs/native-subagents/${agentId}.result.md`;
  const prompt = renderSpawnPrompt({
    agentId,
    agentType,
    profile,
    task,
    allowedPatterns,
    contextPack,
    projectOverlayContext,
    artifactIndex,
    contextDecision,
    budgets: contextPolicy.prompt_budgets ?? {}
  });
  const promptPath = path.join(logsDir, `${agentId}.spawn.md`);
  await writeFile(promptPath, prompt, "utf8");

  tasks.push({
    agent: agentId,
    spawn_name: spawnName,
    agent_type: agentType,
    prompt_path: path.relative(root, promptPath).replaceAll("\\", "/"),
    result_path: resultPath,
    state: "planned",
    wait_group: findGroupForAgent(agentId, nativeConfig),
    close_required: Boolean(nativeConfig.safety?.require_close_agent),
    retention: retentionForAgent(agentId, nativeConfig),
    context_mode: contextDecision.mode,
    context_reasons: contextDecision.reasons,
    model_hint: profile.codex_model_hint ?? profile.model,
    reasoning_effort: profile.reasoning_effort,
    allowed_patterns: allowedPatterns,
    write_owner: ["frontend", "backend", "database", "devops", "tester"].includes(agentId)
  });
}

const orderedTasks = sortByExecutionOrder(tasks.map((task) => task.agent))
  .map((agent) => tasks.find((task) => task.agent === agent))
  .filter(Boolean);

const plan = {
  runId,
  generatedAt: new Date().toISOString(),
  mode: nativeConfig.mode,
  max_parallel_subagents: nativeConfig.safety?.max_parallel_subagents ?? 4,
  retention_capacity: nativeConfig.retention?.capacity ?? {},
  lifecycle: nativeConfig.lifecycle,
  fallback_order: nativeConfig.fallback_order,
  groups: buildGroups(orderedTasks, nativeConfig),
  tasks: orderedTasks,
  tool_protocol: {
    spawn: "spawn_agent(agent_type, message)",
    wait: "wait_agent(targets)",
    close: "close_agent(target)",
    result_path: `.harness/runs/${runId}/logs/native-subagents/<agent>.result.md`
  }
};

await writeFile(path.join(logsDir, "native-subagent-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
await writeFile(path.join(logsDir, "native-subagent-plan.md"), renderPlanMarkdown(plan), "utf8");
await writeFile(path.join(logsDir, "native-state.json"), `${JSON.stringify(await mergeNativeState(plan), null, 2)}\n`, "utf8");

console.log(`原生子 agent 计划已写入：${path.relative(root, logsDir)}`);
for (const task of orderedTasks) console.log(`- ${task.agent}: ${task.agent_type}, ${task.context_mode}, ${task.prompt_path}`);

function buildGroups(tasks, config) {
  const byAgent = new Map(tasks.map((task) => [task.agent, task]));
  return Object.entries(config.parallel_groups ?? {}).map(([id, group]) => ({
    id,
    parallel: Boolean(group.parallel),
    agents: sortByExecutionOrder((group.agents ?? []).filter((agent) => byAgent.has(agent)))
  })).filter((group) => group.agents.length > 0);
}

function findGroupForAgent(agentId, config) {
  for (const [id, group] of Object.entries(config.parallel_groups ?? {})) {
    if ((group.agents ?? []).includes(agentId)) return id;
  }
  return "unassigned";
}

function retentionForAgent(agentId, config) {
  const implementationAgents = new Set(["frontend", "backend", "database", "devops", "tester"]);
  const policy = implementationAgents.has(agentId)
    ? config.retention?.implementation_agents
    : config.retention?.non_implementation_agents;
  return {
    retain_after_result: Boolean(policy?.retain_after_result),
    prefer_resume_before_respawn: Boolean(config.retention?.prefer_resume_before_respawn),
    retained_status_after_completed_result: policy?.retained_status_after_completed_result ?? "completed",
    close_status_before_close_agent: policy?.close_status_before_close_agent ?? "ready_to_close",
    max_idle_minutes: policy?.max_idle_minutes ?? null,
    keep_until: policy?.keep_until ?? []
  };
}

async function mergeNativeState(plan) {
  const statePath = path.join(logsDir, "native-state.json");
  const previous = existsSync(statePath) ? JSON.parse(await readFile(statePath, "utf8")) : {};
  const previousAgents = new Map((previous.agents ?? []).map((agent) => [agent.agent, agent]));
  return {
    runId,
    mode: plan.mode,
    generatedAt: plan.generatedAt,
    updatedAt: new Date().toISOString(),
    fallback: previous.fallback ?? null,
    retention_capacity: plan.retention_capacity,
    agents: [
      ...(previous.agents ?? []).filter((agent) => !plan.tasks.some((task) => task.agent === agent.agent)),
      ...plan.tasks.map((task) => {
      const existing = previousAgents.get(task.agent) ?? {};
      return {
        agent: task.agent,
        spawn_name: task.spawn_name,
        agent_type: task.agent_type,
        prompt_path: task.prompt_path,
        result_path: task.result_path,
        wait_group: task.wait_group,
        status: existing.status ?? "planned",
        handle: existing.handle ?? null,
        spawned_at: existing.spawned_at ?? null,
        result_captured_at: existing.result_captured_at ?? null,
        closed_at: existing.closed_at ?? null,
        close_required: task.close_required,
        close_confirmed: existing.close_confirmed ?? false,
        retention: task.retention,
        result_status: existing.result_status ?? null,
        ready_to_close_at: existing.ready_to_close_at ?? null,
        resumed_at: existing.resumed_at ?? null,
        last_error: existing.last_error ?? null
      };
    })
    ]
  };
}

function renderSpawnPrompt({ agentId, agentType, profile, task, allowedPatterns, contextPack, projectOverlayContext, artifactIndex, contextDecision, budgets = {} }) {
  const taskText = limitText(task, budgets.task_chars ?? 1200);
  const artifactText = limitText(artifactIndex, budgets.artifact_index_chars ?? 900);
  const contextText = limitText(contextPack, budgets.context_pack_chars ?? 900);
  const overlayText = contextPack
    ? "已包含在上下文包中；如需要更细规则，请读取任务输入列出的 overlay/rule 文件。"
    : limitText(projectOverlayContext || "未找到项目 Overlay。", budgets.native_overlay_chars ?? budgets.project_overlay_chars ?? 800);
  const lines = [
    `# 原生子 agent 任务：${agentId}`,
    "",
    `- runId: ${runId}`,
    `- agent: ${agentId}`,
    `- agent_type: ${agentType}`,
    `- model_hint: ${profile.codex_model_hint ?? profile.model}`,
    `- reasoning_effort: ${profile.reasoning_effort}`,
    `- context_mode: ${contextDecision.mode}`,
    `- context_reasons: ${contextDecision.reasons.join("; ")}`,
    "",
    "## 运行规则",
    "",
    "- 你不是唯一在代码库中工作的 agent，其他 agent 或主 agent 可能并行推进。",
    "- 不要回滚或覆盖他人已经完成的修改。",
    "- 只能在自己的职责范围和下方允许修改范围内工作。",
    "- 如果上下文不足，请返回 `needs_input`，并明确需要哪个文件或决策。",
    "- 最终结果必须简洁，并遵守输出契约。",
    "",
    "## 允许修改范围",
    "",
    ...(allowedPatterns.length ? allowedPatterns.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## 当前任务",
    "",
    taskText,
    "",
    "## 项目 Overlay 摘要",
    "",
    overlayText,
    "",
    "## 产物索引",
    "",
    artifactText || "尚未生成产物索引；如有需要，请让主 agent 运行 context-pack。",
    "",
    "## 上下文包",
    "",
    contextText || "尚未生成上下文包；如有需要，只能读取允许范围内的文件。",
    "",
    "## 输出契约",
    "",
    "```text",
    `Agent: ${agentId}`,
    "Status: completed / blocked / needs_input",
    "Summary:",
    "Files changed:",
    "Artifacts updated:",
    "Tests:",
    "Blockers:",
    "Handoff:",
    "```",
    ""
  ];

  return lines.join("\n");
}

function limitText(text, maxChars) {
  const value = String(text ?? "");
  if (!maxChars || value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}\n\n...(已按 native prompt 预算截断；需要细节时读取上方列出的源文件)`;
}

function renderPlanMarkdown(plan) {
  const lines = [
    `# 原生子 agent 计划：${plan.runId}`,
    "",
    `- mode: ${plan.mode}`,
    `- max_parallel_subagents: ${plan.max_parallel_subagents}`,
    "- critical verification order: tester -> reviewer -> release",
    "- do not spawn reviewer before tester completes; do not spawn release before reviewer completes",
    "",
    "## 执行组",
    ""
  ];

  for (const group of plan.groups) {
    lines.push(`### ${group.id}`, "", `- parallel: ${group.parallel}`);
    for (const agent of group.agents) lines.push(`- ${agent}`);
    lines.push("");
  }

  lines.push("## 启动任务", "");
  for (const task of plan.tasks) {
    lines.push(`### ${task.agent}`);
    lines.push(`- spawn_name: ${task.spawn_name}`);
    lines.push(`- agent_type: ${task.agent_type}`);
    lines.push(`- wait_group: ${task.wait_group}`);
    lines.push(`- context_mode: ${task.context_mode}`);
    lines.push(`- reasons: ${task.context_reasons.join("; ")}`);
    lines.push(`- prompt: ${task.prompt_path}`);
    lines.push(`- result: ${task.result_path}`);
    lines.push(`- close_required: ${task.close_required}`);
    lines.push(`- retain_after_result: ${task.retention.retain_after_result}`);
    lines.push(`- write_owner: ${task.write_owner}`);
    lines.push("");
  }

  lines.push("## 生命周期检查清单", "");
  lines.push("- 只启动可以和主 agent 工作并行的非阻塞任务。");
  lines.push("- 当下一步关键路径需要结果时再等待对应 agent。");
  lines.push("- 将结果保存或摘要到 `logs/native-subagents/`。");
  lines.push("- agent 完成后先保留在 `waiting_review`，同时遵守保留容量限制。");
  lines.push("- 当可用名额紧张时，先运行 `harness:native-state -- <run-id> recommend-close` 再启动更多 agent。");
  lines.push("- 对已保留的 agent，优先使用 `send_input`/`resume_agent`，不要直接重复启动替代 agent。");
  lines.push("- 只有在结果已捕获且状态为 `ready_to_close` 后，才关闭 agent。");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function resolveProfile(policy, agentId) {
  const agentPolicy = policy.agent_model_policy?.[agentId] ?? policy.agent_model_policy?.main;
  const profileName = agentPolicy?.profile ?? "standard_analysis";
  const profile = policy.model_profiles?.[profileName] ?? policy.model_profiles?.standard_analysis;
  return {
    profile: profileName,
    model: profile?.model ?? "gpt-5.4",
    codex_model_hint: profile?.codex_model_hint ?? profile?.model ?? "gpt-5.4",
    reasoning_effort: profile?.reasoning_effort ?? "medium"
  };
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
    if (inAllowed && line.trim().startsWith("- ")) patterns.push(normalizeRelPath(line.trim().slice(2)));
  }
  return patterns.filter(Boolean);
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

function normalizeRelPath(inputPath) {
  return inputPath.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}


