import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { analyzeWorkload } from "./lib/workload-analysis.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:spec-freeze -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");

if (!existsSync(inputPath)) {
  console.error(`未找到 run 输入：${path.relative(root, inputPath)}`);
  process.exit(1);
}

await mkdir(artifactsDir, { recursive: true });
await mkdir(logsDir, { recursive: true });

const input = await readFile(inputPath, "utf8");
const existingRequirement = await readOptional(path.join(artifactsDir, "requirement.md"));
const analysis = analyzeWorkload(input);
const frozen = freezeSpec(input, existingRequirement, analysis);

await writeFile(path.join(artifactsDir, "spec-freeze.md"), renderSpecFreeze(frozen), "utf8");
await writeFile(path.join(logsDir, "spec-freeze.json"), `${JSON.stringify(frozen, null, 2)}\n`, "utf8");

console.log(`需求冻结摘要已生成：${path.relative(root, path.join(artifactsDir, "spec-freeze.md")).replaceAll("\\", "/")}`);
console.log(`- profile: ${frozen.workflowProfile}`);
console.log(`- stability: ${frozen.stability}`);
console.log(`- open_questions: ${frozen.openQuestions.length}`);

function freezeSpec(inputText, requirementText, workload) {
  const source = chooseSource(inputText, requirementText);
  const bullets = extractBullets(source);
  const sentences = extractSentences(source);
  const goals = pickByPatterns([...bullets, ...sentences], [
    /目标|实现|新增|修复|优化|完成|支持|需要|希望|build|implement|fix|add|support/i
  ], 5);
  const nonGoals = pickByPatterns([...bullets, ...sentences], [
    /不需要|不要|不做|无需|不包含|不能|避免|do not|without|exclude/i
  ], 5);
  const acceptance = pickByPatterns([...bullets, ...sentences], [
    /验收|通过|成功|测试|验证|期望|应该|必须|acceptance|test|verify|should|must/i
  ], 6);
  const constraints = pickByPatterns([...bullets, ...sentences], [
    /限制|约束|兼容|性能|安全|权限|部署|环境|token|成本|稳定|constraint|compat|security|performance/i
  ], 6);
  const openQuestions = inferOpenQuestions(source, workload);
  const stability = openQuestions.length > 0 || workload.signals?.ambiguous ? "needs_review" : "stable_enough";

  return {
    runId,
    generatedAt: new Date().toISOString(),
    workflowProfile: workload.workflowProfile,
    complexityScore: workload.complexityScore,
    complexityLevel: workload.complexityLevel,
    stability,
    goals: uniqueList(goals.length ? goals : [firstUsefulLine(source) || "按 run 输入完成用户请求。"]),
    nonGoals: uniqueList(nonGoals),
    acceptanceCriteria: uniqueList(acceptance),
    constraints: uniqueList(constraints),
    openQuestions: uniqueList(openQuestions),
    contextRules: [
      "后续 agent 优先读取 spec-freeze.md，再按需读取 input.md。",
      "如果 spec-freeze 与 input.md 冲突，以 input.md 原文为准，并在结果中说明冲突。",
      "不要因为缺少完整上下文而猜测高风险行为；返回 needs_input。"
    ]
  };
}

function chooseSource(inputText, requirementText) {
  if (isMeaningfulRequirementDraft(requirementText)) return stripMarkdownNoise(requirementText);
  return stripMarkdownNoise(inputText);
}

function renderSpecFreeze(spec) {
  return `${[
    `# 需求冻结摘要：${spec.runId}`,
    "",
    `- generatedAt: ${spec.generatedAt}`,
    `- workflowProfile: ${spec.workflowProfile}`,
    `- complexity: ${spec.complexityScore}/5 (${spec.complexityLevel})`,
    `- stability: ${spec.stability}`,
    "",
    "## 目标",
    "",
    ...renderList(spec.goals, "按 run 输入完成用户请求。"),
    "",
    "## 非目标",
    "",
    ...renderList(spec.nonGoals, "未识别到明确非目标。"),
    "",
    "## 验收标准",
    "",
    ...renderList(spec.acceptanceCriteria, "未识别到明确验收标准；执行 agent 需要在结果中补充验证记录。"),
    "",
    "## 约束",
    "",
    ...renderList(spec.constraints, "未识别到额外约束。"),
    "",
    "## 待确认问题",
    "",
    ...renderList(spec.openQuestions, "无。"),
    "",
    "## 上下文使用规则",
    "",
    ...spec.contextRules.map((item) => `- ${item}`),
    ""
  ].join("\n")}\n`;
}

function extractBullets(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => Boolean(line) && !isTemplateNoise(line));
}

function extractSentences(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .split(/[\n。！？!?；;]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4 && !isTemplateNoise(item))
    .slice(0, 40);
}

function pickByPatterns(items, patterns, limit) {
  const seen = new Set();
  const picked = [];
  for (const item of items) {
    if (!patterns.some((pattern) => pattern.test(item))) continue;
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    picked.push(limitText(normalized, 180));
    if (picked.length >= limit) break;
  }
  return picked;
}

function inferOpenQuestions(text, workload) {
  const questions = [];
  if (workload.signals?.ambiguous) questions.push("需求存在探索或不确定信号，进入实现前建议确认目标和验收标准。");
  if (workload.signals?.highRisk) questions.push("命中高风险信号，需要确认数据、权限、发布或回滚边界。");
  if (!/(验收|测试|验证|acceptance|test|verify)/i.test(text)) questions.push("未看到明确验收标准，建议补充如何判断完成。");
  return questions;
}

function stripMarkdownNoise(text) {
  return String(text ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+/gm, "")
    .trim();
}

function firstUsefulLine(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
}

function renderList(items, fallback) {
  const list = uniqueList(items?.length ? items : [fallback]);
  return list.map((item) => `- ${item}`);
}

function limitText(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, maxChars).trim()}...` : text;
}

function uniqueList(items) {
  const values = [...new Set((items ?? []).map((item) => String(item).trim()).filter(Boolean))];
  return values.filter((item) => !values.some((other) =>
    other !== item &&
    other.length > item.length + 3 &&
    other.startsWith(item)
  ));
}

function isMeaningfulRequirementDraft(text) {
  const value = String(text ?? "").trim();
  if (!value) return false;
  if (isTemplateNoise(value)) return false;
  return /(目标|验收|约束|不要|不需要|需求|实现|优化|修复|说明|README|文档|使用)/i.test(value);
}

function isTemplateNoise(text) {
  return /写成可执行|补充可检查|无额外非目标|作为「」|如果没有额外限制|AC-1|Tester Agent 需覆盖/.test(String(text ?? ""));
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}
