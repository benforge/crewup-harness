import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadProjectProfile, productDocsPath, productDocsRunsPath } from "./lib/project-profile.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const approved = args.includes("--approved-product-sync");

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:product-sync -- 2026-05-15-001-blog-mvp --approved-product-sync");
  process.exit(1);
}

if (!approved) {
  console.error("产品文档同步需要用户确认。确认 run 已完成 release 且可以沉淀后，请添加 --approved-product-sync。");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const statePath = path.join(runDir, "state.json");
const { project_profile: projectProfile } = await loadProjectProfile(root);
const productDocsRel = productDocsPath(projectProfile);
const productDocsRunsRel = productDocsRunsPath(projectProfile);

if (!productDocsRel || !productDocsRunsRel) {
  console.log("Product docs sync is disabled for this project profile.");
  process.exit(0);
}
const productDir = path.join(root, productDocsRel);
const productRunsDir = path.join(root, productDocsRunsRel);

if (!existsSync(runDir)) {
  console.error(`找不到 run：${path.relative(root, runDir)}`);
  process.exit(1);
}
if (!existsSync(statePath)) {
  console.error(`缺少 state.json，不允许同步到 ${productDocsRel}。`);
  process.exit(1);
}

await mkdir(productDir, { recursive: true });
await mkdir(productRunsDir, { recursive: true });

const runDate = parseRunDate(runId);
const week = isoWeek(runDate);
const monthId = `${runDate.getUTCFullYear()}-${pad2(runDate.getUTCMonth() + 1)}`;
const yearId = `${runDate.getUTCFullYear()}`;
const weekId = `${runDate.getUTCFullYear()}-w${week}`;

const paths = {
  yearly: path.join(productDir, `yearly-${yearId}.md`),
  monthly: path.join(productDir, `monthly-${monthId}.md`),
  weekly: path.join(productDir, `weekly-${weekId}.md`),
  run: path.join(productRunsDir, `${runId}.md`)
};

const input = await readOptional(path.join(runDir, "input.md"));
const requirement = await readOptional(path.join(artifactsDir, "requirement.md"));
const implementationPlan = await readOptional(path.join(artifactsDir, "implementation-plan.md"));
const releaseSummary = await readOptional(path.join(artifactsDir, "release-summary.md"));
const blockers = await readOptional(path.join(artifactsDir, "blockers.md"));
const testReport = await readOptional(path.join(artifactsDir, "test-report.md"));
const reviewReport = await readOptional(path.join(artifactsDir, "review-report.md"));
const state = JSON.parse(await readFile(statePath, "utf8"));

if (!releaseSummary.trim() || releaseSummary.includes("待 Release Agent 补充")) {
  console.error(`release-summary.md 尚未完成，不允许同步到 ${productDocsRel}。`);
  process.exit(1);
}
if (!["release", "done"].includes(state.stage)) {
  console.error(`当前 run 阶段为 ${state.stage}，只有 release/done 阶段允许 product-sync。`);
  process.exit(1);
}
if (hasRequiredCheckFailure(testReport)) {
  console.error(`test-report.md 存在必需检查失败，不允许同步到 ${productDocsRel}。`);
  process.exit(1);
}
if (reviewHasBlockingIssues(reviewReport)) {
  console.error(`review-report.md 未通过或仍有阻塞问题，不允许同步到 ${productDocsRel}。`);
  process.exit(1);
}

const title = firstHeading(input) ?? humanizeRunId(runId);
const changeItems = sectionBullets(releaseSummary, "变更内容", 6);
const impactItems = sectionBullets(releaseSummary, "用户影响", 5);
const blockerItems = sectionBullets(blockers, "阻塞项", 5);
const nextItems = [
  ...sectionBullets(implementationPlan, "后续步骤", 5),
  ...sectionBullets(reviewReport, "后续建议", 5)
].slice(0, 5);
const verificationItems = [
  ...sectionNumbered(testReport, "验证步骤", 5),
  ...sectionBullets(testReport, "验证结果", 5),
  ...sectionBullets(testReport, "通过项", 5),
  firstSectionSummary(testReport, "结果汇总")
].slice(0, 5);

const compactBlock = renderCompactBlock({
  runId,
  title,
  date: formatDate(runDate),
  changeItems,
  impactItems,
  blockerItems,
  nextItems,
  verificationItems
});

const detailDoc = renderRunDoc({
  runId,
  title,
  date: formatDate(runDate),
  input,
  requirement,
  implementationPlan,
  releaseSummary,
  blockers,
  testReport,
  reviewReport
});

await writeFile(paths.run, detailDoc, "utf8");
await upsertProductFile(paths.weekly, `# ${runDate.getUTCFullYear()} 第 ${week} 周计划`, "## 本周运行记录", runId, compactBlock);
await upsertProductFile(paths.monthly, `# ${runDate.getUTCFullYear()}-${pad2(runDate.getUTCMonth() + 1)} 月目标`, "## 本月运行记录", runId, compactBlock);
await upsertProductFile(paths.yearly, `# ${runDate.getUTCFullYear()} 年目标`, "## 年度运行索引", runId, renderYearlyBlock({ runId, title, date: formatDate(runDate) }));
await recordChangedFiles(Object.values(paths));

console.log("产品文档同步完成：");
console.log(`- ${path.relative(root, paths.run)}`);
console.log(`- ${path.relative(root, paths.weekly)}`);
console.log(`- ${path.relative(root, paths.monthly)}`);
console.log(`- ${path.relative(root, paths.yearly)}`);

async function upsertProductFile(filePath, defaultTitle, sectionTitle, id, block) {
  let content = await readOptional(filePath);
  if (!content.trim()) {
    content = `${defaultTitle}\n\n`;
  }
  content = ensureSection(content, sectionTitle);
  content = upsertMarkedBlock(content, id, block);
  await writeFile(filePath, `${content.trim()}\n`, "utf8");
}

async function recordChangedFiles(filePaths) {
  const manifestPath = path.join(runDir, "logs", "changed-files.json");
  const current = await readChangedFilesManifest(manifestPath);
  const files = unique([
    ...current.files,
    ...filePaths.map((item) => path.relative(root, item).replaceAll("\\", "/"))
  ]);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({ runId, files, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

async function readChangedFilesManifest(manifestPath) {
  if (!existsSync(manifestPath)) return { files: [] };
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8"));
    return { files: Array.isArray(parsed.files) ? parsed.files : [] };
  } catch {
    return { files: [] };
  }
}

function ensureSection(content, sectionTitle) {
  if (content.includes(sectionTitle)) return content;
  return `${content.trim()}\n\n${sectionTitle}\n\n`;
}

function upsertMarkedBlock(content, id, block) {
  const start = `<!-- harness:run-sync:start ${id} -->`;
  const end = `<!-- harness:run-sync:end ${id} -->`;
  const marked = `${start}\n${block.trim()}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (pattern.test(content)) return content.replace(pattern, marked);
  return `${content.trim()}\n\n${marked}\n`;
}

function renderCompactBlock({ runId, title, date, changeItems, impactItems, blockerItems, nextItems, verificationItems }) {
  return [
    `### ${date} ${title}`,
    "",
    `- run: \`${runId}\``,
    `- 详情: [${runId}](runs/${runId}.md)`,
    "",
    "#### 已完成",
    renderList(changeItems, "暂无明确变更摘要，建议补充 release-summary.md。"),
    "",
    "#### 用户影响",
    renderList(impactItems, "暂无明确用户影响。"),
    "",
    "#### 验证",
    renderList(verificationItems, "暂无验证记录，建议补充 tester、gate-check 或 preview-smoke 证据。"),
    "",
    "#### 阻塞和下一步",
    renderList([...blockerItems, ...nextItems].slice(0, 6), "暂无明确阻塞项或下一步。")
  ].join("\n");
}

function renderYearlyBlock({ runId, title, date }) {
  return [
    `- ${date} [${title}](runs/${runId}.md)`,
    `  - run: \`${runId}\``
  ].join("\n");
}

function renderRunDoc({ runId, title, date, input, requirement, implementationPlan, releaseSummary, blockers, testReport, reviewReport }) {
  return [
    `# ${title}`,
    "",
    `- run: \`${runId}\``,
    `- 日期: ${date}`,
    "",
    "## 产品摘要",
    "",
    compactSection(releaseSummary, "变更内容") || "暂无发布变更摘要。",
    "",
    "## 用户影响",
    "",
    compactSection(releaseSummary, "用户影响") || "暂无用户影响说明。",
    "",
    "## 验证和质量",
    "",
    compactSection(testReport, "验证结果")
      || compactSection(testReport, "通过项")
      || compactSection(testReport, "结果汇总")
      || compactSection(testReport, "验证步骤")
      || "暂无验证记录。",
    "",
    "## 阻塞项",
    "",
    compactSection(blockers, "阻塞项") || "暂无阻塞项记录。",
    "",
    "## 下一步",
    "",
    compactSection(implementationPlan, "后续步骤") || compactSection(reviewReport, "后续建议") || "暂无下一步记录。",
    "",
    "## 原始需求",
    "",
    limitText(stripTopHeading(input), 3000) || "暂无 input.md。",
    "",
    "## 需求摘要",
    "",
    limitText(stripTopHeading(requirement), 3000) || "暂无 requirement.md。",
    "",
    "## 实施计划摘要",
    "",
    limitText(stripTopHeading(implementationPlan), 3000) || "暂无 implementation-plan.md。"
  ].join("\n");
}

function compactSection(markdown, heading) {
  const section = extractSection(markdown, heading);
  return limitText(section.trim(), 1600);
}

function sectionBullets(markdown, heading, limit) {
  return extractSection(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function sectionNumbered(markdown, heading, limit) {
  return extractSection(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function firstSectionSummary(markdown, heading) {
  const text = extractSection(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !/^[-*]\s+/.test(line) && !/^\d+\.\s+/.test(line));
  return text ? [text] : [];
}

function extractSection(markdown, heading) {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => {
    const normalized = line.replace(/^#+\s*/, "").trim();
    return normalized === heading;
  });
  if (startIndex === -1) return "";
  const currentLevel = (lines[startIndex].match(/^#+/) ?? [""])[0].length;
  const collected = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(#+)\s+/);
    if (match && match[1].length <= currentLevel) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function renderList(items, emptyText) {
  if (!items.length) return `- ${emptyText}`;
  return items.map((item) => `- ${item}`).join("\n");
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function hasRequiredCheckFailure(content) {
  return /\|\s*[^|\n]+\s*\|\s*failed\s*\|\s*(是|true|required)\s*\|/i.test(content)
    || /必需检查失败|Required verification failed/i.test(content);
}

function reviewHasBlockingIssues(content) {
  if (!content.trim()) return true;
  if (/- \[[xX]\]\s*不通过/.test(content)) return true;
  if (!/- \[[xX]\]\s*(通过|有条件通过)/.test(content) && /##\s*结论/.test(content)) return true;
  return sectionHasSubstantiveBullet(content, "阻塞问题");
}

function sectionHasSubstantiveBullet(content, heading) {
  const section = extractSection(content, heading);
  return section.split(/\r?\n/).some((line) => {
    const text = line.trim().replace(/^[-*]\s*/, "").trim();
    return text && !["无", "暂无", "无阻塞问题", "none", "n/a", "-"].includes(text.toLowerCase());
  });
}

function firstHeading(markdown) {
  const line = markdown.split(/\r?\n/).find((item) => item.startsWith("# "));
  return line?.replace(/^#\s+/, "").trim();
}

function stripTopHeading(markdown) {
  return markdown.replace(/^# .*(\r?\n)+/, "").trim();
}

function limitText(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}\n\n...（已截断，完整内容见 run artifacts）`;
}

function parseRunDate(id) {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date();
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function isoWeek(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
}

function formatDate(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function humanizeRunId(id) {
  return id.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}
