export function decideContextMode({ agentId, task = "", runInput = "", allowedPatterns = [], policy = {}, forceFull = false, forceLight = false }) {
  const config = policy.auto_escalation ?? {};
  if (forceFull) return { mode: config.full_mode ?? "full", reasons: ["forced by --full"] };
  if (forceLight) return { mode: config.default_mode ?? "light", reasons: ["forced by --light"] };
  if (config.enabled === false) return { mode: config.default_mode ?? "light", reasons: ["auto escalation disabled"] };

  const fullMode = config.full_mode ?? "full";
  const targetedMode = config.targeted_mode ?? "targeted";
  const lightMode = config.default_mode ?? "light";
  const reasons = [];
  const taskForSignals = stripIgnoredSections(String(task ?? ""));
  const runHaystack = String(runInput ?? "").toLowerCase();
  const broadHaystack = `${taskForSignals}\n${runInput}`.toLowerCase();
  const normalizedPatterns = allowedPatterns.map(normalizeRelPath);
  const contextHints = extractContextHints(taskForSignals, runInput);

  if ((config.force_full_roles ?? []).includes(agentId)) {
    reasons.push(`role ${agentId} requires full context`);
  }

  if (contextHints.full.length > 0) {
    reasons.push(`task requests full context: ${contextHints.full[0]}`);
  }

  const fullPath = normalizedPatterns.find((item) => (config.full_path_patterns ?? []).some((pattern) => matchPattern(item, pattern)));
  if (fullPath) reasons.push(`write scope hits high-risk path: ${fullPath}`);

  const fullKeyword = (config.full_keywords ?? []).find((keyword) => runHaystack.includes(String(keyword).toLowerCase()));
  if (fullKeyword) reasons.push(`task mentions high-risk keyword: ${fullKeyword}`);

  if (reasons.length > 0) return { mode: fullMode, reasons };

  const targetedReasons = [];
  if ((config.targeted_roles ?? []).includes(agentId)) {
    targetedReasons.push(`role ${agentId} benefits from targeted context`);
  }

  const targetedPath = normalizedPatterns.find((item) => (config.targeted_path_patterns ?? []).some((pattern) => matchPattern(item, pattern)));
  if (targetedPath) targetedReasons.push(`write scope hits project path: ${targetedPath}`);

  const targetedKeyword = (config.targeted_keywords ?? []).find((keyword) => broadHaystack.includes(String(keyword).toLowerCase()));
  if (targetedKeyword) targetedReasons.push(`task mentions targeted keyword: ${targetedKeyword}`);

  if (contextHints.targeted.length > 0 && targetedReasons.length === 0) {
    targetedReasons.push(`task asks for structured context: ${contextHints.targeted[0]}`);
  }

  if (targetedReasons.length > 0) return { mode: targetedMode, reasons: targetedReasons };
  return { mode: lightMode, reasons: ["default light context"] };
}

export function isFullMode(mode) {
  return mode === "full";
}

export function isTargetedMode(mode) {
  return mode === "targeted";
}

export function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

export function matchPattern(relPath, pattern) {
  const normalizedPath = normalizeRelPath(relPath);
  const normalizedPattern = normalizeRelPath(pattern);
  if (!normalizedPattern) return false;
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }
  if (normalizedPattern.includes("*")) {
    return globToRegExp(normalizedPattern).test(normalizedPath);
  }
  return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
}

export function extractContextHints(task, runInput) {
  const text = `${task}\n${runInput}`;
  const full = [];
  const targeted = [];
  const patterns = [
    { regex: /(?:完整|全量|全文|完整上下文|全部上下文|full context)/i, bucket: full, label: "full context" },
    { regex: /(?:摘要|总览|结构|目录|关键章节|关键路径|只看)/i, bucket: targeted, label: "structured summary" },
    { regex: /(?:需求澄清|问答|交互式|拆解|澄清问题|确认边界)/i, bucket: targeted, label: "interactive clarification" }
  ];
  for (const item of patterns) {
    const match = text.match(item.regex);
    if (match) item.bucket.push(item.label);
  }
  return { full, targeted };
}

function globToRegExp(pattern) {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`^${source}$`);
}

function escapeRegExp(char) {
  return char.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}

function stripIgnoredSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (/^##\s+/.test(line) && (line.includes("禁止修改") || line.includes("禁止事项") || line.toLowerCase().includes("forbidden"))) {
      skipping = true;
      continue;
    }
    if (skipping && /^##\s+/.test(line)) skipping = false;
    if (!skipping) kept.push(line);
  }
  return kept.join("\n");
}
