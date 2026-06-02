import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { decideContextMode } from "./lib/context-mode.mjs";
import { loadProjectOverlay, renderOverlayContext } from "./lib/project-overlay.mjs";
import { sortByExecutionOrder } from "./lib/execution-order.mjs";
import { completedNativePrerequisitesForAgent } from "./lib/delegation-guard.mjs";
import {
  buildBridgeTaskManifest,
  isNativeAgentEnvironment,
  readAgentEnvironment,
  renderBridgeManifestMarkdown
} from "./lib/agent-runtime.mjs";

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
const bridgeDir = path.join(runDir, "logs", "agent-bridge");

if (!existsSync(tasksDir)) {
  console.error(`缺少 tasks/。请先运行：npm run harness:prepare-run -- ${runId}`);
  process.exit(1);
}

await mkdir(logsDir, { recursive: true });
await mkdir(bridgeDir, { recursive: true });

const nativeConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "native-subagents.yaml"), "utf8")).native_subagents;
const modelPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "model-policy.yaml"), "utf8"));
const contextPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "context-policy.yaml"), "utf8")).context;
const agentEnvironment = await readAgentEnvironment(root);
const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const runInput = await readOptional(path.join(runDir, "input.md"));
const specFreeze = await readOptional(path.join(runDir, "artifacts", "spec-freeze.md"));
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
  const resultJsonPath = `.harness/runs/${runId}/logs/native-subagents/${agentId}.result.json`;
  const allowedPatternsWithResult = unique([
    ...allowedPatterns,
    resultPath,
    resultJsonPath
  ]);
  const prerequisites = completedNativePrerequisitesForAgent(agentId, { root, runId });
  const prompt = renderSpawnPrompt({
    agentId,
    agentType,
    profile,
    prerequisites,
    task,
    specFreeze,
    allowedPatterns: allowedPatternsWithResult,
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
    task_path: path.relative(root, path.join(tasksDir, taskFile)).replaceAll("\\", "/"),
    prompt_path: path.relative(root, promptPath).replaceAll("\\", "/"),
    result_path: resultPath,
    result_json_path: resultJsonPath,
    handoff_path: `.harness/runs/${runId}/logs/agent-bridge/${agentId}.handoff.md`,
    state: "planned",
    requires_completed_agents: prerequisites,
    wait_group: findGroupForAgent(agentId, nativeConfig),
    close_required: Boolean(nativeConfig.safety?.require_close_agent),
    retention: retentionForAgent(agentId, nativeConfig),
    context_mode: contextDecision.mode,
    context_reasons: contextDecision.reasons,
    model_hint: profile.codex_model_hint ?? profile.model,
    reasoning_effort: profile.reasoning_effort,
    allowed_patterns: allowedPatternsWithResult,
    write_owner: ["frontend", "docs", "backend", "database", "devops", "tester"].includes(agentId)
  });
}

const orderedTasks = sortByExecutionOrder(tasks.map((task) => task.agent))
  .map((agent) => tasks.find((task) => task.agent === agent))
  .filter(Boolean);

if (!isNativeAgentEnvironment(agentEnvironment)) {
  const bridgeTasks = [];
  for (const task of orderedTasks) {
    const bridgeResultPath = `.harness/runs/${runId}/logs/agent-bridge/${task.agent}.result.json`;
    const bridgeTask = {
      agent: task.agent,
      title: `${task.agent} bridge task`,
      task_path: task.task_path,
      handoff_path: task.handoff_path,
      result_path: bridgeResultPath,
      required_output_contract: {
        status_values: ["completed", "blocked", "needs_input"],
        summary_required: true,
        file_changes_required: true,
        artifact_updates_required: true,
        tests_required: true,
        blockers_required: true,
        handoff_required: true
      }
    };
    bridgeTasks.push(bridgeTask);
    await writeFile(
      path.join(root, bridgeTask.handoff_path),
      renderBridgeHandoff({ task, bridgeTask, agentEnvironment }),
      "utf8"
    );
  }

  const manifest = buildBridgeTaskManifest({
    runId,
    agentEnvironment,
    tasks: bridgeTasks
  });

  await writeFile(path.join(bridgeDir, "bridge-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(bridgeDir, "bridge-manifest.md"), renderBridgeManifestMarkdown(manifest), "utf8");
  await writeFile(path.join(bridgeDir, "bridge-state.json"), `${JSON.stringify({
    runId,
    mode: agentEnvironment.mode,
    agent_environment: agentEnvironment,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: manifest.tasks.map((task) => ({
      agent: task.agent,
      task_path: task.task_path,
      handoff_path: task.handoff_path,
      result_path: task.result_path,
      status: "planned"
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`桥接任务清单已写入：${path.relative(root, bridgeDir)}`);
  console.log(`- selected agent: ${agentEnvironment.id}`);
  for (const task of manifest.tasks) console.log(`- ${task.agent}: ${task.handoff_path}`);
  process.exit(0);
}

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
    result_path: `.harness/runs/${runId}/logs/native-subagents/<agent>.result.md`,
    result_json_path: `.harness/runs/${runId}/logs/native-subagents/<agent>.result.json`
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
  const implementationAgents = new Set(["frontend", "docs", "backend", "database", "devops", "tester"]);
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
        result_json_path: task.result_json_path,
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

function renderSpawnPrompt({ agentId, agentType, profile, prerequisites = [], task, specFreeze, allowedPatterns, contextPack, projectOverlayContext, artifactIndex, contextDecision, budgets = {} }) {
  const taskText = limitText(task, budgets.task_chars ?? 1200);
  const frozenText = limitText(specFreeze, budgets.document_policy_chars ?? 1200);
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
    `- requires_completed_agents: ${prerequisites.length ? prerequisites.join(", ") : "(none)"}`,
    "",
    "## 运行规则",
    "",
    "- 如果 requires_completed_agents 不是 `(none)`，主 agent 必须先确认这些 agent 已完成并通过 `native-state mark-result` 捕获结果后，才应该启动你。",
    "- 你不是唯一在代码库中工作的 agent，其他 agent 或主 agent 可能并行推进。",
    "- 不要回滚或覆盖他人已经完成的修改。",
    "- 只能在自己的职责范围和下方允许修改范围内工作。",
    "- 你负责的正式 artifact 必须由你自己写入允许范围内的 artifact 文件；不要只把 artifact 正文返回给主 agent 代写。",
    "- 如果你无法写入自己负责的 artifact，请返回 `blocked` 或 `needs_input`，不要要求主 agent 代写。",
    "- Result files are subagent-owned audit outputs; write them yourself. The main agent may only register them with `native-state mark-result` after they already exist.",
    "- Do not ask the main agent to create, summarize, or copy your `<agent>.result.md` / `<agent>.result.json` files.",
    "- JSON 里的 `artifactUpdates` / `artifactsUpdated` 只能列出你已经实际写入或更新的 artifact。",
    "- 如果你是 tester/reviewer，反馈需要代码修复时只写清 targetAgents 和 requiredFixes，不要直接修改业务代码。",
    "- 如果你是实现类 agent，收到 tester/reviewer 反馈后只修复自己职责范围内的问题，并在结果中引用反馈来源。",
    "- 如果上下文不足，请返回 `needs_input`，并明确需要哪个文件或决策。",
    "- 最终结果必须简洁，并遵守输出契约。",
    "",
    "## 允许修改范围",
    "",
    ...(allowedPatterns.length ? allowedPatterns.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## 当前任务",
    "",
    "### 需求冻结摘要",
    "",
    frozenText || "尚未生成需求冻结摘要；如果需要，请先运行 spec-freeze。",
    "",
    "### 原始任务",
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
    `请同时写入 Markdown 结果文件：${resultPathFor(agentId, "md")}`,
    `请同时写入 JSON 结果文件：${resultPathFor(agentId, "json")}`,
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
    "",
    "```json",
    JSON.stringify({
      agent: agentId,
      status: "completed",
      summary: "一句话总结结果",
      filesChanged: [],
      artifactUpdates: [{ path: "artifacts/<owned-artifact>.md" }],
      artifactsUpdated: ["artifacts/<owned-artifact>.md"],
      tests: [],
      fixRequired: false,
      targetAgents: [],
      requiredFixes: [],
      blockingIssues: [],
      blockers: [],
      handoff: "下一步交接"
    }, null, 2),
    "```",
    ""
  ];

  return lines.join("\n");
}

function renderBridgeHandoff({ task, bridgeTask, agentEnvironment }) {
  return [
    `# Bridge Agent Handoff: ${task.agent}`,
    "",
    `- runId: ${runId}`,
    `- selected_agent: ${agentEnvironment.id}`,
    `- mode: ${agentEnvironment.mode}`,
    `- task_path: ${bridgeTask.task_path}`,
    `- result_path: ${bridgeTask.result_path}`,
    "",
    "## Instructions",
    "",
    "- Execute the task below as an independent agent.",
    "- Stay inside the allowed write scope.",
    "- Do not revert or overwrite unrelated user or agent changes.",
    "- Write the final result as JSON to the exact result_path above.",
    "- Use Chinese for human-facing summaries unless the user requested another language.",
    "",
    "## Required JSON Shape",
    "",
    "```json",
    JSON.stringify({
      agent: task.agent,
      status: "completed | blocked | needs_input",
      summary: "short result summary",
      artifactUpdates: [{ path: "artifacts/test-report.md", content: "full markdown content" }],
      fileChanges: [{ path: "src/example.ts", mode: "update", reason: "why", content: "full file content" }],
      recommendedCodeChanges: [{ path: "src/example.ts", reason: "why", change: "patch or explanation" }],
      tests: ["command or manual verification"],
      fixRequired: false,
      targetAgents: [],
      requiredFixes: [],
      blockingIssues: [],
      blockers: [],
      handoff: "next step for main agent"
    }, null, 2),
    "```",
    "",
    "## Native Prompt Context",
    "",
    `Read the generated prompt for full context: ${task.prompt_path}`,
    "",
    "## Task Metadata",
    "",
    `- agent_type: ${task.agent_type}`,
    `- context_mode: ${task.context_mode}`,
    `- model_hint: ${task.model_hint}`,
    `- reasoning_effort: ${task.reasoning_effort}`,
    "",
    "## Allowed Write Scope",
    "",
    ...(task.allowed_patterns.length ? task.allowed_patterns.map((item) => `- ${item}`) : ["- none"]),
    ""
  ].join("\n");
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
    lines.push(`- requires_completed_agents: ${task.requires_completed_agents.length ? task.requires_completed_agents.join(", ") : "(none)"}`);
    lines.push(`- context_mode: ${task.context_mode}`);
    lines.push(`- reasons: ${task.context_reasons.join("; ")}`);
    lines.push(`- prompt: ${task.prompt_path}`);
    lines.push(`- result: ${task.result_path}`);
    lines.push(`- result_json: ${task.result_json_path}`);
    lines.push(`- close_required: ${task.close_required}`);
    lines.push(`- retain_after_result: ${task.retention.retain_after_result}`);
    lines.push(`- write_owner: ${task.write_owner}`);
    lines.push("");
  }

  lines.push("## 生命周期检查清单", "");
  lines.push("- 只启动可以和主 agent 工作并行的非阻塞任务。");
  lines.push("- 不要启动 `requires_completed_agents` 尚未完成并捕获结果的任务。");
  lines.push("- 当下一步关键路径需要结果时再等待对应 agent。");
  lines.push("- 子 agent 必须自己写入 `logs/native-subagents/<agent>.result.md/json`；主 agent 只登记已存在的 result。");
  lines.push("- 正式 artifact 必须由 owner agent 写入；主 agent 只捕获 result，不代写 owner artifact。");
  lines.push("- agent 完成后先保留在 `waiting_review`，同时遵守保留容量限制。");
  lines.push("- 当可用名额紧张时，先运行 `harness:native-state -- <run-id> recommend-close` 再启动更多 agent。");
  lines.push("- 对已保留的 agent，优先使用 `send_input`/`resume_agent`，不要直接重复启动替代 agent。");
  lines.push("- 只有在结果已捕获且状态为 `ready_to_close` 后，才关闭 agent。");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function resultPathFor(agentId, ext) {
  return `.harness/runs/${runId}/logs/native-subagents/${agentId}.result.${ext}`;
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

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}


