import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { decideContextMode, extractContextHints, isFullMode, isTargetedMode, matchPattern, normalizeRelPath } from "./lib/context-mode.mjs";
import { loadProjectOverlay, renderOverlayContext } from "./lib/project-overlay.mjs";
import {
  extractHeadings,
  limitText,
  oneLineSummary,
  renderArtifactOverview,
  stripSkillCandidateBlocks,
  summarizeArtifactRecord
} from "./lib/artifact-summary.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const forceFull = args.includes("--full");
const forceLight = args.includes("--light");
const selectedAgentsArg = args.find((arg) => arg.startsWith("--agents="));
const selectedAgents = selectedAgentsArg
  ? new Set(selectedAgentsArg.replace("--agents=", "").split(",").map((item) => item.trim()).filter(Boolean))
  : null;

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:context-pack -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const tasksDir = path.join(runDir, "tasks");
const artifactsDir = path.join(runDir, "artifacts");
const contextDir = path.join(runDir, "logs", "context");

if (!existsSync(tasksDir)) {
  console.error(`缺少 tasks/。请先运行：npm run harness:prepare-run -- ${runId}`);
  process.exit(1);
}

const policy = parseYaml(await readFile(path.join(root, ".harness", "config", "context-policy.yaml"), "utf8")).context;
const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const runInput = await readFile(path.join(runDir, "input.md"), "utf8").catch(() => "");
const taskFiles = (await readdir(tasksDir)).filter((name) => name.endsWith(".task.md")).sort();
const written = [];
const decisions = [];

await mkdir(contextDir, { recursive: true });
await writeFile(path.join(contextDir, "artifact-index.md"), await renderArtifactIndex(policy), "utf8");
written.push(path.relative(root, path.join(contextDir, "artifact-index.md")).replaceAll("\\", "/"));

for (const taskFile of taskFiles) {
  const agent = taskFile.replace(".task.md", "");
  if (selectedAgents && !selectedAgents.has(agent)) continue;

  const taskContent = await readFile(path.join(tasksDir, taskFile), "utf8");
  const allowedPatterns = extractAllowedPatterns(taskContent);
  const decision = decideContextMode({ agentId: agent, task: taskContent, runInput, allowedPatterns, policy, forceFull, forceLight });
  const files = await collectFiles(allowedPatterns, policy);
  const impactScopes = extractImpactScopes(taskContent);
  const projectOverlayContext = await renderOverlayContext(root, projectOverlay, agent, {
    maxChars: policy.prompt_budgets?.project_overlay_chars ?? 4000,
    allowedPatterns,
    taskText: taskContent,
    runInput,
    impactScopes
  });
  const markdown = await renderContextPack(agent, taskContent, allowedPatterns, files, policy, decision, projectOverlayContext);
  const target = path.join(contextDir, `${agent}.md`);
  await writeFile(target, markdown, "utf8");
  written.push(path.relative(root, target).replaceAll("\\", "/"));
  decisions.push({ agent, ...decision });
}

console.log(`已生成 ${written.length} 个上下文文件：${path.relative(root, contextDir)}`);
for (const item of written) console.log(`- ${item}`);
for (const decision of decisions) console.log(`  ${decision.agent}: ${decision.mode} (${decision.reasons.join("; ")})`);

async function renderArtifactIndex(policy) {
  const artifactNames = policy.artifact_index?.include_artifacts ?? [];
  const maxChars = policy.artifact_index?.max_chars_per_artifact ?? 700;
  const maxLines = policy.artifact_index?.max_lines_per_artifact ?? 14;
  const cardMax = policy.artifact_index?.card_max_chars_per_artifact ?? maxChars;
  const records = [];

  for (const [index, name] of artifactNames.entries()) {
    const target = path.join(artifactsDir, name);
    if (!existsSync(target)) {
      records.push(summarizeArtifactRecord({
        name,
        status: "missing",
        bytes: 0,
        content: "文件不存在",
        maxChars,
        maxHeadings: maxLines,
        priority: index
      }));
      continue;
    }
    const content = stripSkillCandidateBlocks(await readFile(target, "utf8"));
    const bytes = statSync(target).size;
    records.push(summarizeArtifactRecord({
      name,
      status: content.trim().length < 40 ? "thin" : "ready",
      bytes,
      content,
      maxChars: cardMax,
      maxHeadings: maxLines,
      priority: index
    }));
  }

  const lines = [
    `# Artifact 索引：${runId}`,
    "",
    "这是给主 agent 的 artifact 总览。默认只读表格和卡片；只有需要决策、实现或验收细节时才打开源文件。",
    "",
    renderArtifactOverview(records, {
      title: "Artifact 总览表",
      intro: "这张表用于快速判断当前 run 的产物是否齐全、是否需要深读。",
      includeCards: true
    }).trim(),
    ""
  ];

  const knowledge = await renderKnowledgeIndex(policy);
  if (knowledge) lines.push("## Harness 知识层", "", knowledge, "");

  return `${lines.join("\n")}\n`;
}

async function renderKnowledgeIndex(policy) {
  const maxChars = policy.artifact_index?.knowledge_max_chars ?? 2200;
  const relatedRuns = await readOptional(path.join(contextDir, "related-runs.md"));
  const devMap = await readOptional(path.join(root, ".harness", "knowledge", "dev-map.md"));
  const taskBoard = await readOptional(path.join(root, ".harness", "knowledge", "task-board.md"));
  const lessons = await readOptional(path.join(root, ".harness", "knowledge", "lessons-learned.md"));
  const decisionIndex = await readOptional(path.join(root, ".harness", "knowledge", "decision-index.md"));
  const runIndex = await readOptional(path.join(root, ".harness", "knowledge", "run-index.json"));
  const skillSops = await readSkillSops();
  const chunks = [];
  if (relatedRuns) chunks.push("### related-runs.md", summarizeMarkdown(relatedRuns, 28));
  if (devMap) chunks.push("### dev-map.md", summarizeMarkdown(devMap, 18));
  if (taskBoard) chunks.push("### task-board.md", summarizeMarkdown(taskBoard, 14));
  if (decisionIndex) chunks.push("### decision-index.md", summarizeMarkdown(decisionIndex, 12));
  if (runIndex) chunks.push("### run-index.json", summarizeRunIndex(runIndex, 8));
  if (lessons) chunks.push("### lessons-learned.md", summarizeMarkdown(lessons, 12));
  if (skillSops) chunks.push("### 内部技能 SOP", skillSops);
  if (!chunks.length) return "未找到知识层文件。请运行 `npm run harness:knowledge` 生成 dev-map 和 task-board。";
  return limitText(chunks.join("\n\n"), maxChars);
}

async function readSkillSops() {
  const skillsDir = path.join(root, ".harness", "skills");
  const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const chunks = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".md")).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(skillsDir, entry.name);
    const content = await readFile(target, "utf8").catch(() => "");
    chunks.push(`#### ${entry.name}\n${summarizeMarkdown(content, 8)}`);
  }
  return chunks.join("\n\n");
}

async function renderContextPack(agent, taskContent, allowedPatterns, files, policy, decision, projectOverlayContext) {
  const taskHints = extractContextHints(taskContent, runInput);
  const lines = [
    `# ${agent} 上下文包`,
    "",
    `- runId（运行 ID）：${runId}`,
    `- 上下文模式：${decision.mode}`,
    `- 生成时间：${new Date().toISOString()}`,
    `- 升级原因：${decision.reasons.join("; ")}`,
    "",
    "## 允许修改范围",
    "",
    ...(allowedPatterns.length ? allowedPatterns.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## 项目 Overlay",
    "",
    projectOverlayContext,
    "",
    "## 相关文件",
    ""
  ];

  if (files.length === 0) {
    lines.push("未为该 agent 收集到匹配的项目文件。");
    return `${lines.join("\n")}\n`;
  }

  let totalBytes = 0;
  let count = 0;
  for (const file of files) {
    if (count >= policy.max_files_per_agent) break;
    const absolute = path.join(root, file);
    const size = statSync(absolute).size;
    if (size > policy.max_bytes_per_file) continue;
    if (totalBytes + size > policy.max_total_bytes_per_agent) break;
    const content = await readFile(absolute, "utf8");
    const prioritized = prioritizeContent(content, taskHints, decision.mode);
    totalBytes += size;
    count += 1;

    lines.push(`### ${file}`);
    lines.push(`- 字节数：${size}`);
    if (isFullMode(decision.mode)) {
      lines.push("", "```text", limitText(prioritized.full, policy.max_bytes_per_file), "```", "");
    } else if (isTargetedMode(decision.mode)) {
      const excerptChars = policy.prompt_budgets?.targeted_context_chars
        ? Math.min(1800, Math.floor(policy.prompt_budgets.targeted_context_chars / Math.max(1, policy.max_files_per_agent)))
        : 900;
      lines.push(`- 摘要：${oneLineSummary(prioritized.targeted)}`);
      lines.push("", "```text", limitText(prioritized.targeted, excerptChars), "```", "");
    } else {
      lines.push(`- 摘要：${oneLineSummary(prioritized.light)}`);
      lines.push(`- 需要细节时读取：${file}`);
      lines.push("");
    }
  }

  lines.push("## 统计", "", `- 候选文件数：${files.length}`, `- 已纳入文件数：${count}`, `- 已纳入字节数：${totalBytes}`);
  return `${lines.join("\n")}\n`;
}

function prioritizeContent(content, taskHints, mode) {
  const text = String(content ?? "");
  const sections = splitSections(text);
  const hints = [...(taskHints.full ?? []), ...(taskHints.targeted ?? [])].map((item) => item.toLowerCase());
  const picked = sections.filter((section) => hints.some((hint) => section.heading.toLowerCase().includes(hint)));
  const prioritized = picked.map((section) => section.block).join("\n\n");
  if (mode === "full") return { full: prioritized ? `${prioritized}\n\n${text}` : text, targeted: prioritized || text, light: prioritized || text };
  if (mode === "targeted") return { full: text, targeted: prioritized || text, light: prioritized || text };
  return { full: text, targeted: text, light: prioritized || text };
}

function splitSections(content) {
  const lines = String(content ?? "").split(/\r?\n/);
  const sections = [];
  let current = { heading: "", lines: [] };
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      if (current.lines.length > 0) sections.push({ heading: current.heading, block: current.lines.join("\n") });
      current = { heading: line.replace(/^#{1,6}\s+/, "").trim(), lines: [line] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.length > 0) sections.push({ heading: current.heading, block: current.lines.join("\n") });
  return sections;
}

async function collectFiles(patterns, policy) {
  if (patterns.length === 0) return [];
  const allFiles = await walk(root, policy);
  return allFiles
    .map((file) => path.relative(root, file).replaceAll("\\", "/"))
    .filter((file) => isIncluded(file, patterns, policy))
    .sort();
}

async function walk(dir, policy) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    const rel = path.relative(root, target).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (isExcluded(`${rel}/`, policy)) continue;
      files.push(...await walk(target, policy));
    } else {
      files.push(target);
    }
  }
  return files;
}

function isIncluded(file, patterns, policy) {
  if (isExcluded(file, policy)) return false;
  if (!policy.include_extensions.includes(path.extname(file))) return false;
  return patterns.some((pattern) => matchPattern(file, pattern));
}

function isExcluded(file, policy) {
  return (policy.exclude_paths ?? []).some((pattern) => matchPattern(file, pattern));
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

function summarizeMarkdown(markdown, maxLines) {
  const kept = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("- ") || line.startsWith("* ") || /^\d+\./.test(line)) {
      kept.push(rawLine);
    }
    if (kept.length >= maxLines) break;
  }
  return kept.join("\n") || markdown.split(/\r?\n/).filter(Boolean).slice(0, maxLines).join("\n");
}

function summarizeRunIndex(jsonText, maxRuns) {
  try {
    const parsed = JSON.parse(jsonText);
    const runs = (parsed.runs ?? []).slice(-maxRuns).reverse();
    if (!runs.length) return "暂无 run 索引。";
    return runs.map((run) => {
      const modules = run.modules?.length ? ` modules=${run.modules.slice(0, 4).join(",")}` : "";
      const summary = [...(run.capabilities ?? []), ...(run.decisions ?? [])].slice(0, 2).join("; ");
      return `- ${run.runId}: ${run.status}/${run.stage}${modules}${summary ? ` | ${summary}` : ""}`;
    }).join("\n");
  } catch {
    return "run-index.json 无法解析。";
  }
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}


