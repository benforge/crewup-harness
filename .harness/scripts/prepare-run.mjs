import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { inferOverlayScopeMatches, loadProjectOverlay, overlayRuleFilesForAgent, overlaySummary, resolveImpactScopes } from "./lib/project-overlay.mjs";
import { analyzeWorkload, renderWorkloadAnalysisMarkdown } from "./lib/workload-analysis.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const requestedProfile = valueOf("--profile=") ?? "auto";

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:prepare-run -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const tasksDir = path.join(runDir, "tasks");

if (!existsSync(runDir) || !existsSync(inputPath)) {
  console.error(`未找到 run 或 input.md：${path.relative(root, runDir)}`);
  process.exit(1);
}

const input = await readFile(inputPath, "utf8");
await mkdir(tasksDir, { recursive: true });

const agentsConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "agents.yaml"), "utf8")).agents;
const modelPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "model-policy.yaml"), "utf8"));
const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const impactScopesConfig = resolveImpactScopes(projectProfile, projectOverlay.profile);

const workloadAnalysis = analyzeWorkload(input, { requestedProfile });
const workflowProfile = workloadAnalysis.workflowProfile;
const impactScopes = detectImpactScopes(input, impactScopesConfig, projectOverlay.profile);
const selectedAgents = selectAgents(input, agentsConfig, impactScopesConfig, projectProfile, workflowProfile, impactScopes);

for (const entry of await readdir(tasksDir, { withFileTypes: true })) {
  if (entry.isFile() && (entry.name.endsWith(".task.md") || entry.name === "main-agent-summary.md")) {
    await rm(path.join(tasksDir, entry.name));
  }
}

for (const agentId of selectedAgents) {
  const agent = agentsConfig[agentId];
  const task = buildAgentTask(agentId, agent, input, projectProfile, impactScopes);
  await writeFile(path.join(tasksDir, `${agentId}.task.md`), task, "utf8");
}

await writeFile(path.join(tasksDir, "main-agent-summary.md"), buildMainSummary(selectedAgents, workflowProfile, impactScopes), "utf8");
await mkdir(path.join(runDir, "logs"), { recursive: true });
await writeFile(path.join(runDir, "logs", "workload-analysis.json"), `${JSON.stringify(workloadAnalysis, null, 2)}\n`, "utf8");
await writeFile(path.join(runDir, "logs", "workload-analysis.md"), renderWorkloadAnalysisMarkdown(workloadAnalysis), "utf8");
await updateRunState({ workflowProfile, workloadAnalysis });

console.log(`已生成 ${selectedAgents.length} 个 agent 任务：${path.relative(root, tasksDir)}`);
console.log(`workflow_profile: ${workflowProfile}`);
console.log(`complexity: ${workloadAnalysis.complexityScore}/5 (${workloadAnalysis.complexityLevel})`);
console.log(`impact_scopes: ${impactScopes.length ? impactScopes.join(",") : "(none)"}`);
for (const agentId of selectedAgents) console.log(`- ${agentId}`);

function selectAgents(inputText, agents, impactScopeConfig, profile, runProfile, impactScopes) {
  const selected = new Set();
  if (runProfile === "full") selected.add("pm");
  if (["standard", "full"].includes(runProfile)) {
    selected.add("requirements");
    selected.add("architect");
  }

  for (const scope of impactScopes) {
    const config = impactScopeConfig[scope];
    for (const agent of config?.agents ?? []) selected.add(agent);
  }

  for (const agentId of Object.keys(agents)) {
    const flags = agents[agentId].impact_flags ?? [];
    if (flags.some((flag) => hasImpact(inputText, flag))) selected.add(agentId);
  }

  if (needsDocsAgent(inputText)) selected.add("docs");

  const implementationAgents = ["frontend", "docs", "backend", "database", "devops"].filter((agent) => selected.has(agent));
  if (runProfile === "lite" && implementationAgents.length === 0) {
    selected.add("reviewer");
  }

  if (runProfile === "lite") {
    if (needsDedicatedTester(inputText)) selected.add("tester");
    selected.add("tester");
    selected.add("reviewer");
    selected.add("release");
  } else {
    const verificationAgents = profile.default_agents?.verification ?? ["reviewer"];
    for (const agent of verificationAgents) selected.add(agent);

    if (implementationAgents.length > 0 || runProfile === "full") {
      selected.add("tester");
      selected.add("reviewer");
      selected.add("release");
    } else {
      if (needsDedicatedTester(inputText)) selected.add("tester");
      if (needsReleaseAgent(inputText)) selected.add("release");
    }
  }

  return [...selected].filter((agentId) => agents[agentId]);
}

function needsDedicatedTester(inputText) {
  return /(测试|回归|bug|修复|接口|API|后端|数据库|状态|表单|权限|登录|性能|兼容|验收|端到端|e2e)/i.test(inputText);
}

function needsReleaseAgent(inputText) {
  return /(发布|上线|部署|release|changelog|版本|生产|回滚|交付)/i.test(inputText);
}

function needsDocsAgent(inputText) {
  return /(文档|说明|README|readme|docs?|markdown|\.md|使用说明|接入说明|健康检查说明|开发指南|安装说明|配置说明|教程|手册|指南)/i.test(inputText);
}

function hasImpact(inputText, flag) {
  const checked = new RegExp(`- \\[[xX]\\]\\s+${escapeRegExp(flag)}\\b`);
  const mentioned = new RegExp(`\\b${escapeRegExp(flag)}\\b`, "i");
  if (checked.test(inputText) || mentioned.test(inputText)) return true;
  const aliases = {
    web: [
      /C\s*端/i,
      /c\s*端/i,
      /前端|页面|网页|网站|站点|首页|相册|照片墙|瀑布流|布局|样式|文案|中文化|导航|空态|错误态|移动端|响应式/
    ],
    frontend: [
      /C\s*端/i,
      /c\s*端/i,
      /前端|页面|网页|网站|站点|首页|相册|照片墙|瀑布流|布局|样式|文案|中文化|导航|空态|错误态|移动端|响应式/
    ],
    docs: [/文档|说明|README|readme|docs?|markdown|\.md|使用说明|接入说明|开发指南|安装说明|配置说明|教程|手册|指南/i],
    admin: [/后台|管理端|管理后台|运营后台|admin/i],
    api: [/接口|后端|服务端|API/i],
    backend: [/接口|后端|服务端|API/i],
    db: [/数据库|数据表|迁移|schema|索引/i],
    database: [/数据库|数据表|迁移|schema|索引/i],
    infra: [/部署|CI|CD|Docker|环境变量|流水线/i],
    devops: [/部署|CI|CD|Docker|环境变量|流水线/i]
  };
  return (aliases[flag] ?? []).some((pattern) => pattern.test(inputText));
}

function buildAgentTask(agentId, agent, inputText, profile, impactScopes) {
  const model = resolveModel(agentId, agent);
  const allowed = allowedPathsFor(agentId, impactScopesConfig, impactScopes).map((item) => replaceRun(item));
  const projectRuleFiles = overlayRuleFilesForAgent(projectOverlay, agentId, {
    allowedPatterns: allowed,
    taskText: inputText,
    impactScopes
  });
  const inputs = [
    `.harness/runs/${runId}/input.md`,
    `.harness/runs/${runId}/artifacts/requirement.md`,
    `.harness/runs/${runId}/artifacts/architecture.md`,
    `.harness/runs/${runId}/artifacts/implementation-plan.md`,
    `.harness/runs/${runId}/logs/context/related-runs.md`,
    ".harness/AGENTS.md",
    agent.owner,
    ".harness/config/agents.yaml",
    ".harness/project/profile.yaml",
    projectOverlay.exists ? projectOverlay.path : null,
    ".harness/config/model-policy.yaml",
    ".harness/config/document-policy.yaml",
    ...(agent.rule_files ?? []),
    ...projectRuleFiles
  ].filter(Boolean);

  return `# Agent 任务：${agentId}

## Run 信息

- runId: ${runId}
- agent: ${agentId}
- stage: ${agent.default_stage}
- category: ${agent.category}
- impact_scopes: ${impactScopes.length ? impactScopes.join(", ") : "(none)"}

## 推荐模型

- profile: ${model.profile}
- model: ${model.model}
- reasoning_effort: ${model.reasoning_effort}

## 输入

${inputs.map((item) => `- ${item}`).join("\n")}

## 项目 Overlay

${overlaySummary(projectOverlay)}

## 职责范围

${(agent.scope ?? []).map((item) => `- ${item}`).join("\n")}

## 允许修改范围

${allowed.length ? allowed.map((item) => `- ${item}`).join("\n") : "- 无"}

## 禁止事项

- 无关业务代码
- 其他活跃 agent 负责的文件
- 未经 release 确认前的产品长期文档目录
- 密钥、token、生产环境文件

## 必须产出

${requiredOutputsFor(agentId).map((item) => `- ${item}`).join("\n")}

## 当前 run 输入快照

${limitText(inputText.trim(), 2500) || "（空）"}

## 完成检查清单

- [ ] 已阅读 run 输入和相关 artifacts
- [ ] 已保持在职责范围和允许修改范围内
- [ ] 已记录测试，或说明无法运行测试的原因
- [ ] 已更新对应 artifact 或结果摘要
`;
}

function allowedPathsFor(agentId, impactScopeConfig, impactScopes) {
  const paths = [];
  const selectedScopes = new Set(impactScopes);
  for (const [scope, config] of Object.entries(impactScopeConfig ?? {})) {
    if (selectedScopes.size > 0 && !selectedScopes.has(scope)) continue;
    if ((config.agents ?? []).includes(agentId)) {
      paths.push(...(config.write_paths ?? []), ...(config.artifacts ?? []));
    }
  }

  if (paths.length > 0) return [...new Set(paths)];

  const artifactByAgent = {
    pm: [".harness/runs/<run>/artifacts/requirement.md", ".harness/runs/<run>/state.json"],
    "requirements-plan": [".harness/runs/<run>/artifacts/requirement-plan.md"],
    requirements: [".harness/runs/<run>/artifacts/requirement.md"],
    architect: [".harness/runs/<run>/artifacts/architecture.md", ".harness/runs/<run>/artifacts/implementation-plan.md"],
    docs: ["README.md", "docs/**", "*.md"],
    tester: [".harness/runs/<run>/artifacts/test-report.md"],
    reviewer: [".harness/runs/<run>/artifacts/review-report.md"],
    release: [".harness/runs/<run>/artifacts/release-summary.md"]
  };
  return artifactByAgent[agentId] ?? [];
}

function requiredOutputsFor(agentId) {
  const outputs = {
    pm: ["scope notes", "priority/boundary questions"],
    "requirements-plan": ["artifacts/requirement-plan.md"],
    requirements: ["artifacts/requirement.md"],
    architect: ["artifacts/architecture.md", "artifacts/implementation-plan.md"],
    frontend: ["frontend code changes or implementation notes", "verification notes"],
    docs: ["documentation changes", "docs/README update notes", "verification notes"],
    backend: ["backend code changes or API notes", "artifacts/api-change.md"],
    database: ["migration/schema notes", "artifacts/db-migration.md"],
    devops: ["deployment/CI notes", "rollback notes"],
    tester: ["artifacts/test-report.md"],
    reviewer: ["artifacts/review-report.md"],
    release: ["artifacts/release-summary.md"]
  };
  return outputs[agentId] ?? ["task result summary"];
}

function resolveModel(agentId, agent) {
  const profileName = modelPolicy.agent_model_policy?.[agentId]?.profile
    ?? agent.model_profile
    ?? "standard_analysis";
  const profile = modelPolicy.model_profiles?.[profileName] ?? {};
  return {
    profile: profileName,
    model: profile.codex_model_hint ?? profile.model ?? "gpt-5.4",
    reasoning_effort: profile.reasoning_effort ?? "medium"
  };
}

function buildMainSummary(selectedAgents, workflowProfile, impactScopes) {
  const main = resolveModel("main", { model_profile: "low_cost" });
  return `# 主 agent 汇总

## Run 信息

- runId: ${runId}
- workflow_profile: ${workflowProfile}
- impact_scopes: ${impactScopes.length ? impactScopes.join(", ") : "(none)"}

## 主 agent 模型

- profile: ${main.profile}
- model: ${main.model}
- reasoning_effort: ${main.reasoning_effort}

## 已生成任务

${selectedAgents.map((agent) => `- tasks/${agent}.task.md`).join("\n")}

## 执行说明

- 创建或选择 run 前先使用 intake 判断。
- 需求仍粗糙时，先运行 requirements-plan，再进入实现。
- 当生命周期工具可用时，使用 native subagents。
- 用户确认前，规划产物必须保留在 run artifacts 内。
- 产品文档同步只能在 release 后，并且获得明确确认后执行。
`;
}

function replaceRun(inputPath) {
  return inputPath.replaceAll("<run>", runId);
}

function detectImpactScopes(inputText, impactScopeConfig, overlayProfile) {
  const scopes = new Set();
  for (const scope of Object.keys(impactScopeConfig ?? {})) {
    if (hasExplicitScopeSignal(inputText, scope)) scopes.add(scope);
  }

  for (const match of inferOverlayScopeMatches(overlayProfile, { taskText: inputText })) {
    if (impactScopeConfig?.[match.scope] && match.confidence !== "low") scopes.add(match.scope);
  }
  return [...scopes];
}

function hasExplicitScopeSignal(inputText, scope) {
  const checked = new RegExp(`- \\[[xX]\\]\\s+${escapeRegExp(scope)}\\b`);
  if (checked.test(inputText)) return true;
  if (new Set(["ui"]).has(scope)) return false;
  return new RegExp(`\\b${escapeRegExp(scope)}\\b`, "i").test(inputText);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function limitText(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n...(已截断)` : text;
}

async function updateRunState({ workflowProfile, workloadAnalysis }) {
  const statePath = path.join(runDir, "state.json");
  if (!existsSync(statePath)) return;
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const now = new Date().toISOString();
  state.workflowProfile = workflowProfile;
  state.workloadAnalysis = {
    complexityScore: workloadAnalysis.complexityScore,
    complexityLevel: workloadAnalysis.complexityLevel,
    inferredProfile: workloadAnalysis.inferredProfile,
    needsRequirementsPlan: workloadAnalysis.needsRequirementsPlan,
    updatedAt: now
  };

  if (isDocsOnlyRun(selectedAgents)) {
    state.confirmations = state.confirmations ?? {};
    state.confirmations.implementation_approved_at = state.confirmations.implementation_approved_at ?? now;
  }

  if (
    state.stage === "requirements_plan"
    && workloadAnalysis.needsRequirementsPlan === false
    && workflowProfile === "lite"
  ) {
    state.stage = "implement";
    state.owners = selectedAgents;
    state.transitions = [
      ...(state.transitions ?? []),
      {
        from: "requirements_plan",
        to: "implement",
        at: now,
        reason: "lite_run_skips_requirements_plan"
      }
    ];
  }

  state.updatedAt = now;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function isDocsOnlyRun(agentList) {
  const agents = new Set(agentList ?? []);
  if (!agents.has("docs")) return false;
  return !["frontend", "backend", "database", "devops", "pm", "requirements-plan", "requirements", "architect"].some((agent) => agents.has(agent));
}


