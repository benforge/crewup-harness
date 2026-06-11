import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const limit = Number(valueOf("--limit=") ?? 3);

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:knowledge-select -- <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const contextDir = path.join(runDir, "logs", "context");
const relatedJsonPath = path.join(contextDir, "related-runs.json");
const relatedMdPath = path.join(contextDir, "related-runs.md");
const recalledLessonsJsonPath = path.join(contextDir, "recalled-lessons.json");
const recalledLessonsMdPath = path.join(contextDir, "recalled-lessons.md");
const memoryHintsPath = path.join(contextDir, "memory-hints.md");
const runIndexPath = path.join(root, ".harness", "knowledge", "run-index.json");
const lessonIndexPath = path.join(root, ".harness", "knowledge", "lesson-index.json");

if (!existsSync(inputPath)) {
  console.error(`缺少 run 输入：${path.relative(root, inputPath)}`);
  process.exit(1);
}

await mkdir(contextDir, { recursive: true });

const input = await readFile(inputPath, "utf8");
const requirementPlan = await readOptional(path.join(runDir, "artifacts", "requirement-plan.md"));
const requirement = await readOptional(path.join(runDir, "artifacts", "requirement.md"));
const architecture = await readOptional(path.join(runDir, "artifacts", "architecture.md"));
const state = await readJsonOptional(path.join(runDir, "state.json"), {});
const queryText = [
  input,
  stripTemplateNoise(requirementPlan),
  stripTemplateNoise(requirement),
  stripTemplateNoise(architecture)
].join("\n");
const queryTerms = extractTerms(queryText);
const currentScopes = new Set([
  ...extractScopes(input),
  ...extractCheckedScopes(requirementPlan),
  ...extractCheckedScopes(requirement),
  ...extractCheckedScopes(architecture)
]);
const runIndex = await readRunIndex();
const lessonIndex = await readLessonIndex();
const candidates = scoreRuns(runIndex.runs ?? [], { queryTerms, currentScopes })
  .filter((item) => item.run.runId !== runId)
  .filter((item) => item.score > 0)
  .sort((left, right) => right.score - left.score || String(right.run.updatedAt ?? "").localeCompare(String(left.run.updatedAt ?? "")))
  .slice(0, Math.max(0, limit));

const result = {
  runId,
  generatedAt: new Date().toISOString(),
  source: ".harness/knowledge/run-index.json",
  queryTerms: [...queryTerms].slice(0, 40),
  currentScopes: [...currentScopes],
  selected: candidates.map(({ run, score, reasons }) => ({
    runId: run.runId,
    title: run.title,
    status: run.status,
    stage: run.stage,
    updatedAt: run.updatedAt,
    score,
    reasons,
    modules: run.modules ?? [],
    capabilities: run.capabilities ?? [],
    decisions: run.decisions ?? [],
    followups: run.followups ?? [],
    artifactPaths: artifactPaths(run.runId)
  }))
};
const selectedLessons = scoreLessons(lessonIndex.lessons ?? [], { queryTerms, currentScopes, workflowProfile: state.workflowProfile })
  .filter((item) => item.score > 0)
  .sort((left, right) => right.score - left.score || right.lesson.confidence - left.lesson.confidence)
  .slice(0, 12);
const lessonsResult = {
  runId,
  generatedAt: new Date().toISOString(),
  source: ".harness/knowledge/lesson-index.json",
  currentScopes: [...currentScopes],
  selected: selectedLessons.map(({ lesson, score, reasons }) => ({
    ...lesson,
    score,
    reasons
  }))
};

await writeFile(relatedJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(relatedMdPath, renderMarkdown(result), "utf8");
await writeFile(recalledLessonsJsonPath, `${JSON.stringify(lessonsResult, null, 2)}\n`, "utf8");
await writeFile(recalledLessonsMdPath, renderLessonsMarkdown(lessonsResult), "utf8");
await writeFile(memoryHintsPath, renderMemoryHints({ related: result, lessons: lessonsResult }), "utf8");

console.log(`相关历史 run 已写入：${path.relative(root, relatedMdPath).replaceAll("\\", "/")}`);
console.log(`Memory hints 已写入：${path.relative(root, memoryHintsPath).replaceAll("\\", "/")}`);
if (result.selected.length === 0) {
  console.log("未命中相关历史 run。");
} else {
  for (const item of result.selected) console.log(`- ${item.runId}: score=${item.score}`);
}

async function readRunIndex() {
  if (!existsSync(runIndexPath)) {
    console.error("缺少 .harness/knowledge/run-index.json，请先运行 npm run harness:knowledge");
    process.exit(1);
  }
  try {
    return JSON.parse(await readFile(runIndexPath, "utf8"));
  } catch (error) {
    console.error(`无法解析 run-index.json：${error.message}`);
    process.exit(1);
  }
}

async function readLessonIndex() {
  if (!existsSync(lessonIndexPath)) {
    return { lessons: [] };
  }
  try {
    return JSON.parse(await readFile(lessonIndexPath, "utf8"));
  } catch {
    return { lessons: [] };
  }
}

function scoreRuns(runs, { queryTerms, currentScopes }) {
  return runs.map((run) => {
    const text = [
      run.title,
      run.runId,
      ...(run.modules ?? []),
      ...(run.capabilities ?? []),
      ...(run.decisions ?? []),
      ...(run.apiChanges ?? []),
      ...(run.dbChanges ?? []),
      ...(run.followups ?? [])
    ].join("\n").toLowerCase();
    const runScopes = new Set((run.modules ?? []).map((item) => String(item).toLowerCase()));
    let score = 0;
    const reasons = [];

    for (const scope of currentScopes) {
      if (runScopes.has(scope) || text.includes(scope)) {
        score += 8;
        reasons.push(`scope:${scope}`);
      }
    }

    let termHits = 0;
    for (const term of queryTerms) {
      if (text.includes(term)) {
        termHits += 1;
        score += term.length >= 4 ? 3 : 1;
        if (reasons.length < 8) reasons.push(`term:${term}`);
      }
    }

    if (run.status === "done") score += 1;
    if (termHits === 0 && reasons.length === 0) score = 0;
    return { run, score, reasons };
  });
}

function scoreLessons(lessons, { queryTerms, currentScopes, workflowProfile }) {
  return lessons
    .filter((lesson) => lesson.status !== "archived")
    .map((lesson) => {
      const text = [
        lesson.id,
        lesson.domain,
        lesson.trigger,
        lesson.action,
        lesson.sourceRun,
        ...(lesson.scope ?? [])
      ].join("\n").toLowerCase();
      let score = 0;
      const reasons = [];

      for (const scope of currentScopes) {
        if ((lesson.scope ?? []).map((item) => String(item).toLowerCase()).includes(scope) || text.includes(scope)) {
          score += 8;
          reasons.push(`scope:${scope}`);
        }
      }

      let termHits = 0;
      for (const term of queryTerms) {
        if (text.includes(term)) {
          termHits += 1;
          score += term.length >= 4 ? 3 : 1;
          if (reasons.length < 8) reasons.push(`term:${term}`);
        }
      }

      if (lesson.status === "active") score += 8;
      if (lesson.status === "candidate") score -= 2;
      if (workflowProfile && text.includes(String(workflowProfile).toLowerCase())) {
        score += 2;
        reasons.push(`profile:${workflowProfile}`);
      }
      if (termHits === 0 && reasons.length === 0 && !hasGenericHighValueLesson(lesson)) score = 0;
      return { lesson, score: Math.max(0, score), reasons };
    });
}

function hasGenericHighValueLesson(lesson) {
  return lesson.status === "active" && ["workflow", "risk"].includes(lesson.domain) && Number(lesson.confidence ?? 0) >= 0.75;
}

function extractTerms(text) {
  const normalized = String(text ?? "").toLowerCase();
  const stopWords = new Set([
    "run",
    "runs",
    "harness",
    "requirement",
    "related",
    "context",
    "logs",
    "true",
    "false",
    "todo",
    "null",
    "undefined",
    "需求",
    "目标",
    "非目标",
    "验收",
    "标准",
    "影响",
    "范围",
    "测试",
    "回滚",
    "方案",
    "实现",
    "页面",
    "功能",
    "用户",
    "当前",
    "本次",
    "项目"
  ]);
  const terms = new Set();
  for (const match of normalized.match(/[a-z0-9][a-z0-9_-]{2,}/g) ?? []) {
    if (!stopWords.has(match)) terms.add(match);
  }
  for (const match of normalized.match(/[\u4e00-\u9fa5]{2,12}/g) ?? []) {
    for (const token of cjkTokens(match)) {
      if (!stopWords.has(token)) terms.add(token);
    }
  }
  for (const scope of extractScopes(text)) terms.add(scope);
  return terms;
}

function cjkTokens(text) {
  const tokens = new Set();
  if (text.length <= 6) tokens.add(text);
  for (let size = 2; size <= 4; size += 1) {
    for (let index = 0; index <= text.length - size; index += 1) {
      tokens.add(text.slice(index, index + size));
    }
  }
  return [...tokens];
}

function extractScopes(text) {
  const scopes = new Set();
  const raw = String(text ?? "");
  const patterns = {
    web: /web|apps\/web|前台|公开站点|C\s*端|c\s*端|首页|文章|相册|照片墙/i,
    admin: /admin|apps\/admin|后台|管理端|管理后台|cms|CMS/i,
    api: /api|apps\/api|接口|后端|服务端|controller/i,
    db: /db|database|数据库|迁移|schema|表结构/i,
    infra: /infra|部署|CI|CD|Docker|流水线|环境变量/i,
    docs: /docs|文档|产品文档|release|发布摘要/i
  };
  for (const [scope, pattern] of Object.entries(patterns)) {
    if (pattern.test(raw)) scopes.add(scope);
  }
  return scopes;
}

function extractCheckedScopes(text) {
  const scopes = new Set();
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const match = line.trim().match(/^- \[[xX]\]\s+([a-z][a-z0-9_-]*)\b/i);
    if (match) scopes.add(match[1].toLowerCase());
  }
  return scopes;
}

function stripTemplateNoise(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .filter((line) => !/^- \[ \]\s+(web|admin|api|db|infra|docs)\b/i.test(line.trim()))
    .filter((line) => !line.includes("请先阅读 `logs/context/related-runs.md`"))
    .join("\n");
}

function artifactPaths(selectedRunId) {
  const base = `.harness/runs/${selectedRunId}/artifacts`;
  return {
    requirement: `${base}/requirement.md`,
    architecture: `${base}/architecture.md`,
    implementationPlan: `${base}/implementation-plan.md`,
    releaseSummary: `${base}/release-summary.md`,
    reviewReport: `${base}/review-report.md`
  };
}

function renderMarkdown(data) {
  const lines = [
    `# 相关历史 run：${data.runId}`,
    "",
    "> 本文件由 `npm run harness:knowledge-select` 自动生成。Requirements 和 Architect 必须先阅读本摘要；需要细节时再打开对应历史 artifacts。",
    "",
    `- generatedAt: ${data.generatedAt}`,
    `- source: ${data.source}`,
    `- currentScopes: ${data.currentScopes.length ? data.currentScopes.join(", ") : "(none)"}`,
    "",
    "## 使用规则",
    "",
    "- 需求和架构阶段必须说明：复用了哪些历史决策、与哪些历史方案冲突、是否没有命中相关历史。",
    "- 默认只深读下方最多 3 个历史 run；除非高风险或用户要求，不要展开所有历史 run。",
    "- 如果本摘要为空，也要在 `requirement.md` 或 `architecture.md` 写明“未命中相关历史 run”。",
    "",
    "## 命中结果",
    ""
  ];

  if (data.selected.length === 0) {
    lines.push("- 未命中相关历史 run。", "");
    return `${lines.join("\n")}\n`;
  }

  for (const item of data.selected) {
    lines.push(
      `### ${item.runId}`,
      "",
      `- title: ${item.title ?? "-"}`,
      `- status: ${item.status}/${item.stage}`,
      `- updatedAt: ${item.updatedAt ?? "-"}`,
      `- score: ${item.score}`,
      `- reasons: ${item.reasons.join(", ") || "-"}`,
      `- modules: ${item.modules.join(", ") || "-"}`,
      "",
      "#### 历史能力 / 决策摘要",
      "",
      ...(compact([...item.capabilities, ...item.decisions, ...item.followups]).map((entry) => `- ${entry}`)),
      "",
      "#### 建议深读 artifacts",
      "",
      `- requirement: \`${item.artifactPaths.requirement}\``,
      `- architecture: \`${item.artifactPaths.architecture}\``,
      `- implementationPlan: \`${item.artifactPaths.implementationPlan}\``,
      `- releaseSummary: \`${item.artifactPaths.releaseSummary}\``,
      `- reviewReport: \`${item.artifactPaths.reviewReport}\``,
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderLessonsMarkdown(data) {
  const lines = [
    `# Recalled Lessons: ${data.runId}`,
    "",
    "> Generated by `npm run harness:knowledge-select`. Candidate lessons are review material only; active lessons may be used as memory hints.",
    "",
    `- generatedAt: ${data.generatedAt}`,
    `- source: ${data.source}`,
    `- currentScopes: ${data.currentScopes.length ? data.currentScopes.join(", ") : "(none)"}`,
    "",
    "## Selected Lessons",
    ""
  ];

  if (data.selected.length === 0) {
    lines.push("- none", "");
    return `${lines.join("\n")}\n`;
  }

  for (const item of data.selected) {
    lines.push(
      `### ${item.id}`,
      "",
      `- status: ${item.status}`,
      `- domain: ${item.domain}`,
      `- confidence: ${item.confidence}`,
      `- score: ${item.score}`,
      `- reasons: ${item.reasons.join(", ") || "-"}`,
      `- scope: ${(item.scope ?? []).join(", ") || "-"}`,
      `- trigger: ${item.trigger}`,
      `- action: ${item.action}`,
      `- sourceRun: ${item.sourceRun ?? "-"}`,
      `- path: \`${item.path}\``,
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderMemoryHints({ related, lessons }) {
  const activeLessons = lessons.selected
    .filter((item) => item.status === "active")
    .slice(0, 5);
  const candidateCount = lessons.selected.filter((item) => item.status === "candidate").length;
  const relatedRuns = related.selected.slice(0, 2);
  const lines = [
    "# Memory Hints",
    "",
    "> Short hints only. These are not routing authority; `next-agent`, gates, and owner policies remain authoritative.",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- relatedRuns: ${related.selected.length}`,
    `- activeLessons: ${activeLessons.length}`,
    `- candidateSignals: ${candidateCount}`,
    "",
    "## Hints",
    ""
  ];

  if (relatedRuns.length === 0 && activeLessons.length === 0) {
    lines.push("- none");
  } else {
    for (const item of relatedRuns) {
      const summary = [...(item.capabilities ?? []), ...(item.decisions ?? [])].slice(0, 2).join("; ") || item.title || "related run";
      lines.push(`- run:${item.runId} [score=${item.score}] ${limitText(summary, 140)}`);
    }
    for (const item of activeLessons) {
      lines.push(`- ${item.id} [${item.domain}, confidence=${item.confidence}] ${limitText(item.action || item.trigger, 150)}`);
    }
  }

  lines.push(
    "",
    "## Expand If Needed",
    "",
    `- related runs: \`.harness/runs/${related.runId}/logs/context/related-runs.md\``,
    `- recalled lessons: \`.harness/runs/${related.runId}/logs/context/recalled-lessons.md\``,
    ""
  );

  return `${lines.join("\n")}\n`;
}

function compact(items) {
  const cleaned = [...new Set((items ?? []).map((item) => String(item ?? "").trim()).filter(Boolean))];
  return cleaned.length ? cleaned.slice(0, 8) : ["-"];
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}

async function readJsonOptional(target, fallback) {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch {
    return fallback;
  }
}

function limitText(text, maxChars) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > maxChars ? `${value.slice(0, maxChars).trim()}...` : value;
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
