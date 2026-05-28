import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const force = args.includes("--force");
const promote = args.includes("--promote");

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:requirements-plan -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const artifactsDir = path.join(runDir, "artifacts");
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs", "requirements-planning");
const planPath = path.join(artifactsDir, "requirement-plan.md");
const requirementPath = path.join(artifactsDir, "requirement.md");

if (!existsSync(inputPath)) {
  console.error(`缺少 run 输入：${path.relative(root, inputPath)}`);
  process.exit(1);
}

await mkdir(artifactsDir, { recursive: true });
await mkdir(tasksDir, { recursive: true });
await mkdir(logsDir, { recursive: true });

if (promote) {
  if (!existsSync(planPath)) {
    console.error(`Missing requirement plan: ${path.relative(root, planPath)}`);
    process.exit(1);
  }
  const plan = await readFile(planPath, "utf8");
  await writeFile(requirementPath, promotePlanToRequirement(plan), "utf8");
  await writeFile(
    path.join(logsDir, "promoted.md"),
    `# 需求扩写草案已提升\n\n- runId: ${runId}\n- 来源：${rel(planPath)}\n- 目标：${rel(requirementPath)}\n- 提升时间：${new Date().toISOString()}\n`,
    "utf8"
  );
  console.log(`已将需求扩写草案提升为 ${rel(requirementPath)}`);
  process.exit(0);
}

const config = parseYaml(await readFile(path.join(root, ".harness", "config", "requirements-planning.yaml"), "utf8")).requirements_planning;
const input = await readFile(inputPath, "utf8");
const templatePath = path.join(root, ".harness", "templates", "requirement-plan.md");
const template = existsSync(templatePath)
  ? await readFile(templatePath, "utf8")
  : "# 需求扩写草案\n";

if (!existsSync(planPath) || force) {
  await writeFile(planPath, renderPlanArtifact(template, input), "utf8");
}

const taskPath = path.join(tasksDir, `${config.agent_id}.task.md`);
await writeFile(taskPath, renderTask({ config, input }), "utf8");
await writeFile(
  path.join(logsDir, "created.md"),
  `# 需求扩写任务已创建\n\n- runId: ${runId}\n- 任务：${rel(taskPath)}\n- artifact：${rel(planPath)}\n- 创建时间：${new Date().toISOString()}\n`,
  "utf8"
);

console.log(`需求扩写任务已写入：${rel(taskPath)}`);
console.log(`草案 artifact 已写入：${rel(planPath)}`);
console.log(`下一步：npm run harness:native-plan -- ${runId} --agents=${config.agent_id}`);

function renderPlanArtifact(template, input) {
  return `${template.trim()}\n\n## 原始需求\n\n${input.trim() || "（空）"}\n`;
}

function promotePlanToRequirement(plan) {
  const history = section(plan, "过往背景");
  return [
    "# 需求说明",
    "",
    "## 背景",
    "",
    contentOrTodo(section(plan, "需求背景") || section(plan, "原始需求摘要")),
    "",
    "## 过往背景",
    "",
    contentOrTodo(history),
    "",
    "## 复用的历史决策",
    "",
    contentOrTodo(extractHistoryLine(history, "复用") || history),
    "",
    "## 与历史方案的冲突或变化",
    "",
    contentOrTodo(extractHistoryLine(history, "冲突") || section(plan, "风险与边界")),
    "",
    "## 目标",
    "",
    contentOrTodo(section(plan, "目标")),
    "",
    "## 非目标",
    "",
    contentOrTodo(section(plan, "非目标")),
    "",
    "## 用户故事",
    "",
    contentOrTodo([section(plan, "用户角色与权限"), section(plan, "核心用户流程")].filter(Boolean).join("\n\n")),
    "",
    "## 验收标准",
    "",
    contentOrTodo(section(plan, "验收标准")),
    "",
    "## 影响范围",
    "",
    contentOrTodo(section(plan, "影响范围候选")),
    "",
    "## 测试要求",
    "",
    "- Tester Agent 需覆盖上述验收标准，并在 `artifacts/test-report.md` 记录自动化或人工验证结果。",
    "",
    "## 回滚方式",
    "",
    "- 回滚本 run 产生的代码和配置变更；如涉及数据、迁移或生产配置，由对应 agent 在方案阶段补充专门回滚步骤。",
    "",
    "## 待确认问题",
    "",
    contentOrNone(section(plan, "待确认问题")),
    ""
  ].join("\n");
}

function section(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(markdown);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = /^##\s+/m.exec(rest);
  return cleanSection(next ? rest.slice(0, next.index) : rest);
}

function cleanSection(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "-" && line.trim() !== "")
    .join("\n")
    .trim();
}

function contentOrTodo(content) {
  return content && content.trim() ? content.trim() : "- 暂无明确补充；由对应阶段 agent 根据本轮需求补齐。";
}

function contentOrNone(content) {
  return content && content.trim() ? content.trim() : "- 无。";
}

function extractHistoryLine(content, keyword) {
  return content
    .split(/\r?\n/)
    .find((line) => line.includes(keyword))
    ?.trim() ?? "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTask({ config, input }) {
  const sections = (config.sections ?? []).map((item) => `- ${item}`).join("\n");
  return `# 原生子 agent 任务：${config.agent_id}

## Run 信息

- runId: ${runId}
- agent: ${config.agent_id}
- stage: ${config.stage}

## 推荐模型

- profile: ${config.model_profile}
- mode: ${config.mode?.name ?? "plan_only"}
- agent_type: ${config.agent_type}

## 输入

- .harness/runs/${runId}/input.md
- .harness/runs/${runId}/artifacts/requirement-interview.md
- .harness/runs/${runId}/artifacts/requirement-plan.md
- .harness/runs/${runId}/logs/context/related-runs.md
- .harness/agents/requirements.md
- .harness/config/requirements-planning.yaml
- .harness/config/model-policy.yaml

## 职责范围

使用 plan-only 需求分析，把用户原始想法扩写为清晰、可评审的需求草案。不要写业务代码，不要做架构决策，不要启动实现工作。

## 允许修改范围

- .harness/runs/${runId}/artifacts/requirement-plan.md

## 禁止事项

- 业务代码变更
- 应由 architect 负责的架构决策
- 实现任务执行
- 未经用户在 release 后明确要求时写入 docs/product/**

## 必须包含章节

${sections}

## 用户原始需求

${input.trim() || "（空）"}

## 完成检查清单

- [ ] 已把原始需求扩写为具体目标和非目标
- [ ] 当需求模糊或已有交互回答时，已使用 requirement-interview.md
- [ ] 已把验收标准写成可检查的陈述
- [ ] 已列出未确认事项；如果没有未确认事项，明确写“无。”
- [ ] 已标记候选影响范围
- [ ] 未保留空列表项、模板占位、\`TBD\`、\`待补充\` 或 \`待 Agent 补充\` 文案
- [ ] 输出只保留在 artifacts/requirement-plan.md
`;
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}
