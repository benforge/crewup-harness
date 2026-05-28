import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { decideContextMode, normalizeRelPath } from "./lib/context-mode.mjs";
import { loadProjectOverlay, renderOverlayContext } from "./lib/project-overlay.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const forceFull = args.includes("--full");
const forceLight = args.includes("--light");
const fastMode = args.includes("--fast");
const selectedAgentsArg = args.find((arg) => arg.startsWith("--agents="));
const selectedAgents = selectedAgentsArg
  ? new Set(selectedAgentsArg.replace("--agents=", "").split(",").map((item) => item.trim()).filter(Boolean))
  : null;

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:desktop-plan -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const tasksDir = path.join(runDir, "tasks");
const outDir = path.join(runDir, "logs", "desktop-agents");

if (!existsSync(tasksDir)) {
  console.error(`缺少 tasks/。请先运行：npm run harness:prepare-run -- ${runId}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await removeOldPrompts(outDir);

const desktopConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "desktop-runner.yaml"), "utf8"));
const modelPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "model-policy.yaml"), "utf8"));
const skillsConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "skills.yaml"), "utf8"));
const projectProfile = parseYaml(await readFile(path.join(root, ".harness", "config", "project-profile.yaml"), "utf8")).project_profile;
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const contextPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "context-policy.yaml"), "utf8")).context;
const budgets = contextPolicy.prompt_budgets ?? {};
const documentPolicy = await readOptional(path.join(root, ".harness", "config", "document-policy.yaml"));
const input = stripSkillCandidateBlocks(await readFile(path.join(runDir, "input.md"), "utf8"));
const artifactIndex = await readOptional(path.join(runDir, "logs", "context", "artifact-index.md"));
const taskFiles = (await readdir(tasksDir)).filter((name) => name.endsWith(".task.md")).sort();
const generated = [];
const budgetRows = [];

for (const taskFile of taskFiles) {
  const agentId = taskFile.replace(".task.md", "");
  if (selectedAgents && !selectedAgents.has(agentId)) continue;

  const task = await readFile(path.join(tasksDir, taskFile), "utf8");
  const allowedPatterns = extractAllowedPatterns(task);
  const impactScopes = extractImpactScopes(task);
  const contextDecision = decideContextMode({ agentId, task, runInput: input, allowedPatterns, policy: contextPolicy, forceFull, forceLight });
  const agentDoc = await readOptional(path.join(root, ".harness", "agents", `${agentId}.md`));
  const ruleDoc = await readOptional(path.join(root, ".harness", "rules", `${agentId}.md`));
  const contextPack = await readOptional(path.join(runDir, "logs", "context", `${agentId}.md`));
  const projectOverlayContext = await renderOverlayContext(root, projectOverlay, agentId, {
    maxChars: budgets.project_overlay_chars ?? 4000,
    allowedPatterns,
    taskText: task,
    runInput: input,
    impactScopes
  });
  const profile = resolveProfile(modelPolicy, agentId, { fastMode });
  const parts = buildPromptParts({
    agentId,
    profile,
    task,
    agentDoc,
    ruleDoc,
    contextPack,
    projectOverlayContext,
    documentPolicy,
    artifactIndex,
    skillContext: renderSkillContext(skillsConfig, agentId, contextPolicy),
    contextDecision
  });
  const prompt = renderPrompt(parts);
  const target = path.join(outDir, `${agentId}.prompt.md`);
  await writeFile(target, prompt, "utf8");
  generated.push(`${agentId}.prompt.md`);
  budgetRows.push(renderBudgetRow(agentId, parts, prompt));
}

await writeFile(path.join(outDir, "desktop-execution-plan.md"), renderExecutionPlan(generated, budgetRows), "utf8");

console.log(`已生成 Codex Desktop prompts：${path.relative(root, outDir)}`);
console.log(`prompt_mode: ${forceFull ? "full" : forceLight ? "light" : "auto"}`);
console.log(`model_mode: ${fastMode ? "fast" : "policy"}`);
for (const item of generated) console.log(`- ${item}`);

function buildPromptParts({ agentId, profile, task, agentDoc, ruleDoc, contextPack, projectOverlayContext, documentPolicy, artifactIndex, skillContext, contextDecision }) {
  const roleRules = [summarizeMarkdown(agentDoc), summarizeMarkdown(ruleDoc)].filter(Boolean).join("\n\n");
  const contextBudget = contextDecision.mode === "full"
    ? budgets.full_context_chars ?? 12000
    : contextDecision.mode === "targeted"
      ? budgets.targeted_context_chars ?? 5000
      : budgets.context_pack_chars ?? 2500;
  return {
    header: `# Codex Desktop 子 agent Prompt：${agentId}`,
    mode: [
      `- prompt_mode: ${forceFull ? "full" : forceLight ? "light" : "auto"}`,
      `- context_mode: ${contextDecision.mode}`,
      `- context_reasons: ${contextDecision.reasons.join("; ")}`,
      `- model_mode: ${fastMode ? "fast" : "policy"}`,
      "- default_context: 精简产物索引 + 每个 agent 的文件索引"
    ].join("\n"),
    model: [
      `- profile: ${profile.profile}`,
      `- model: ${profile.codex_model_hint ?? profile.model}`,
      `- reasoning_effort: ${profile.reasoning_effort}`
    ].join("\n"),
    identity: [
      "你是被委派的 Codex Desktop 子 agent。",
      "只处理当前任务和当前角色范围内的工作。",
      "除非任务明确要求其他语言，否则最终交接使用中文。"
    ].join("\n"),
    input: limitText(input, budgets.run_input_chars ?? 1600),
    task: limitText(task, budgets.task_chars ?? 2600),
    skills: limitText(skillContext, budgets.skill_context_chars ?? 700),
    roleRules: limitText(roleRules, budgets.role_rules_chars ?? 900),
    writePolicy: renderWritePolicy(),
    projectOverlay: limitText(projectOverlayContext, budgets.project_overlay_chars ?? 4000),
    documentPolicy: limitText(summarizeMarkdown(documentPolicy), budgets.document_policy_chars ?? 800),
    artifactIndex: limitText(artifactIndex || "尚未生成产物索引。请运行 `npm run harness:context-pack -- <runId>` 生成精简上下文。", budgets.artifact_index_chars ?? 2600),
    contextPack: contextDecision.mode === "light"
        ? limitText(summarizeContextPack(contextPack), contextBudget)
        : limitText(contextPack, contextBudget),
    outputFormat: [
      "Agent: " + agentId,
      "Status: completed / blocked / needs_input",
      "Summary:",
      "Files changed:",
      "Artifacts updated:",
      "Tests:",
      "Blockers:",
      "Handoff:"
    ].join("\n")
  };
}

function renderPrompt(parts) {
  return [
    parts.header,
    "",
    "## 模式",
    "",
    parts.mode,
    "",
    "## 推荐模型",
    "",
    parts.model,
    "",
    "## 身份",
    "",
    parts.identity,
    "",
    "## 当前 run 输入",
    "",
    parts.input,
    "",
    "## 当前任务",
    "",
    parts.task,
    "",
    "## 技能策略",
    "",
    parts.skills,
    "",
    "## 角色规则摘要",
    "",
    parts.roleRules || "无",
    "",
    parts.writePolicy,
    "",
    "## 项目 Overlay",
    "",
    parts.projectOverlay || "无",
    "",
    "## 文档策略摘要",
    "",
    parts.documentPolicy || "无",
    "",
    "## 产物索引",
    "",
    parts.artifactIndex,
    "",
    "## 上下文包",
    "",
    parts.contextPack || "无；如有需要，只读取允许范围内的文件",
    "",
    "## 输出格式",
    "",
    "```text",
    parts.outputFormat,
    "```",
    ""
  ].join("\n");
}

function renderExecutionPlan(generated, budgetRows) {
  const groups = desktopConfig.desktop_runner?.execution_groups ?? [];
  const lines = [
    `# Codex Desktop 执行计划：${runId}`,
    "",
    `- prompt_mode: ${forceFull ? "full" : forceLight ? "light" : "auto"}`,
    `- model_mode: ${fastMode ? "fast" : "policy"}`,
    "",
    "## 使用方式",
    "",
    "只打开本次 run 需要的 prompt。上下文模式默认自动判断；只有需要强制覆盖时才使用 `--full` 或 `--light`。",
    "",
    "## 执行组",
    ""
  ];

  for (const group of groups) {
    lines.push(`### ${group.id}`, "", `- parallel: ${group.parallel ? "true" : "false"}`);
    for (const agent of group.agents ?? []) {
      const file = `${agent}.prompt.md`;
      if (generated.includes(file)) lines.push(`- ${agent}: ${file}`);
    }
    lines.push("");
  }

  lines.push("## 已生成 Prompts", "", ...generated.map((name) => `- ${name}`), "");
  lines.push("## 上下文预算报告", "", "| agent | prompt 字符数 | run 输入 | 任务 | 技能 | 角色规则 | 产物索引 | 上下文包 |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |", ...budgetRows, "");
  return `${lines.join("\n")}\n`;
}

function renderBudgetRow(agentId, parts, prompt) {
  return [
    `| ${agentId}`,
    prompt.length,
    parts.input.length,
    parts.task.length,
    parts.skills.length,
    parts.roleRules.length,
    parts.artifactIndex.length,
    parts.contextPack.length
  ].join(" | ") + " |";
}

async function removeOldPrompts(dir) {
  const files = await readdir(dir).catch(() => []);
  await Promise.all(files.filter((name) => name.endsWith(".prompt.md")).map((name) => unlink(path.join(dir, name))));
}

function resolveProfile(policy, agentId, { fastMode = false } = {}) {
  const agentPolicy = policy.agent_model_policy?.[agentId] ?? policy.agent_model_policy?.main;
  const profileName = agentPolicy?.profile ?? "standard_analysis";
  const profile = policy.model_profiles?.[profileName] ?? policy.model_profiles?.standard_analysis;
  if (fastMode) {
    const fastProfile = policy.model_profiles?.low_cost ?? {};
    return {
      profile: `${profileName} (fast override)`,
      model: fastProfile.model ?? "gpt-5.4-mini",
      codex_model_hint: fastProfile.codex_model_hint ?? fastProfile.model ?? "gpt-5.4-mini",
      reasoning_effort: fastProfile.reasoning_effort ?? "low"
    };
  }
  return {
    profile: profileName,
    model: profile?.model ?? "gpt-5.4",
    codex_model_hint: profile?.codex_model_hint ?? profile?.model ?? "gpt-5.4",
    reasoning_effort: profile?.reasoning_effort ?? "medium"
  };
}

function summarizeMarkdown(markdown) {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("- ") || /^\d+\./.test(trimmed)) kept.push(line);
    if (kept.length >= 30) break;
  }
  return kept.join("\n");
}

function summarizeContextPack(contextPack) {
  if (!contextPack) return "";
  const lines = contextPack.split(/\r?\n/);
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("- ")) kept.push(line);
    if (kept.length >= 60) break;
  }
  return kept.join("\n");
}

function renderSkillContext(config, agentId, contextPolicy) {
  const skillPolicy = contextPolicy.skill_context ?? {};
  const roleSkills = config?.role_skills ?? config?.skills ?? {};
  const commonSkills = roleSkills.common ?? [];
  const agentSkills = roleSkills[agentId] ?? [];
  const labels = [...new Set([...commonSkills, ...agentSkills])].slice(0, skillPolicy.max_role_labels ?? 12);
  const candidates = Object.entries(config?.external_skill_candidates ?? {})
    .filter(([, item]) => (item.roles ?? []).includes(agentId));

  const lines = [
    "以下引用只是能力提示，不代表技能已经启用。",
    "请用 `npx skills list --json` 确认可用项目技能；只有相关时才读取 SKILL.md。",
    "",
    "角色标签：",
    ...labels.map((item) => `- ${item}`)
  ];

  if (skillPolicy.include_external_candidates !== false && candidates.length > 0) {
    lines.push("", "外部候选技能：");
    for (const [name, item] of candidates) {
      const skillPath = path.join(root, ".agents", "skills", name, "SKILL.md");
      const status = existsSync(skillPath) ? "installed" : (item.status ?? "candidate");
      lines.push(`- ${name}: ${status}`);
      if (skillPolicy.include_installed_paths && existsSync(skillPath)) {
        lines.push(`  path: .agents/skills/${name}/SKILL.md`);
      }
      if (skillPolicy.include_install_commands && item.install_command) {
        lines.push(`  install: ${item.install_command}`);
      }
    }
  }

  return lines.join("\n");
}

function renderWritePolicy() {
  return [
    "## 写入与风险策略",
    "",
    "只能修改当前任务范围内的文件。高风险变更必须阻塞或标记为 `needs_input`。",
    "规划产物保存在 `.harness/runs/<run>/artifacts/`；没有明确确认时不要写入 `docs/product/`。"
  ].join("\n");
}

function stripSkillCandidateBlocks(markdown) {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (/^##\s*Skill\s*候选\s*$/i.test(line.trim())) {
      skipping = true;
      continue;
    }
    if (skipping && /^##\s+/.test(line)) skipping = false;
    if (!skipping) kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractAllowedPatterns(task) {
  const lines = task.split(/\r?\n/);
  const patterns = [];
  let inAllowed = false;
  for (const line of lines) {
    if (line.startsWith("## ") && (line.includes("允许修改") || line.includes("Allowed"))) {
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

function limitText(text, maxChars) {
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n...(已截断；如需细节请读取源文件)` : text;
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}
