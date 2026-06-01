export function stripSkillCandidateBlocks(markdown) {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    if (/^##\s*Skill\s*Candidates\s*$/i.test(line.trim()) || /^##\s*Skill\s*候选\s*$/i.test(line.trim())) {
      skipping = true;
      continue;
    }
    if (skipping && /^##\s+/.test(line)) skipping = false;
    if (!skipping) kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function oneLineSummary(content) {
  const lines = String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#") || line.startsWith("export ") || line.startsWith("class ") || line.startsWith("function "));
  const first = lines.length ? lines.slice(0, 4).join(" | ") : String(content ?? "").trim().split(/\r?\n/).find(Boolean) ?? "（空）";
  return first.slice(0, 260);
}

export function extractHeadings(content, maxLines = 8) {
  const headings = [];
  for (const rawLine of String(content ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) headings.push(line.replace(/^##\s+/, "").trim());
    if (headings.length >= maxLines) break;
  }
  return headings;
}

export function escapePipes(text) {
  return String(text ?? "").replaceAll("|", "\\|");
}

export function limitText(text, maxChars) {
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n...(已截断；如需细节请读取源文件)` : text;
}

export function summarizeArtifactRecord({ name, status, bytes, content, maxChars = 350, maxHeadings = 8, priority = 0 }) {
  const summary = limitText(oneLineSummary(content), maxChars) || "（空）";
  const headings = extractHeadings(content, maxHeadings);
  const readiness = buildReadHint({ status, headings, priority });
  return {
    name,
    status,
    bytes,
    summary,
    headings,
    readiness,
    priority
  };
}

export function renderArtifactOverview(records, { title = "Artifact 总览", intro = "先看表格，再按需打开卡片。", includeCards = true } = {}) {
  const lines = [
    `## ${title}`,
    "",
    intro,
    "",
    "| Artifact | 状态 | 内容摘要 | 关键章节 | 大小 | 读取建议 |",
    "| --- | --- | --- | --- | ---: | --- |",
    ...records.map((item) => `| \`${item.name}\` | ${item.status} | ${escapePipes(item.summary)} | ${escapePipes(item.headings.join("<br>") || "-")} | ${item.bytes} | ${escapePipes(item.readiness)} |`)
  ];

  if (includeCards) {
    lines.push("", "## 详细卡片", "");
    for (const item of records) {
      lines.push(
        `### \`${item.name}\``,
        `- 状态：${item.status}`,
        `- 内容摘要：${item.summary}`,
        `- 关键章节：${item.headings.join(" / ") || "-"}`,
        `- 读取建议：${item.readiness}`,
        `- 大小：${item.bytes}`,
        ""
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildReadHint({ status, headings, priority }) {
  if (status === "missing") return "先补齐，再继续主流程。";
  if (status === "thin") return "内容偏薄，建议先读全文确认上下文。";
  if (status === "placeholder") return "先确认是否为占位稿，再决定是否需要重写。";
  if (priority <= 1) return `优先阅读；${headings.length ? `关键章节：${headings[0]}` : "适合先读全文。"}`;
  if (headings.length === 0) return "可以先看摘要，必要时再展开全文。";
  return "先看摘要即可，若要决策再打开全文。";
}
