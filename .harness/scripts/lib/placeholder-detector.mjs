const TEMPLATE_PLACEHOLDER_SNIPPETS = [
  "explain why this requirement is needed",
  "one sentence describing what this run should deliver",
  "waiting for Architect Agent",
  "waiting for Tester Agent",
  "waiting for Release Agent",
  "as a user, I want",
  "reuse historical background:",
  "conflict or change:",
  "constraints to extend:",
  "old issues to avoid:",
  "- extend:",
  "- replace:",
  "- add:"
];

const TEMPLATE_PLACEHOLDER_PATTERNS = [
  /\bTBD\b/i,
  /\bTODO\s*:/i,
  /\bplaceholder\s+(text|content|copy|artifact|section)\b/i,
  /\btemplate\s+placeholder\b/i,
  /\bfill\s+(this|here|in)\b/i,
  /\bto\s+be\s+(filled|completed|defined)\b/i,
  /\bwaiting\s+for\s+\S+\s+Agent\b/i,
  /\u6a21\u677f(\u5360\u4f4d|\u6b8b\u7559|\u672a\u66ff\u6362|\u5f85\u586b)/,
  /(\u5360\u4f4d\u7b26|\u5360\u4f4d\u6587\u6848|\u5360\u4f4d\u5185\u5bb9)/,
  /(\u8bf7\u586b\u5199|\u8fd9\u91cc\u586b\u5199|\u5f85\u586b\u5199|\u5f85\u8865\u5145|\u5f85\u5b8c\u5584)/,
  /\u5f85\s+\S+\s+Agent\s+\u8865\u5145/i
];

export function hasTemplatePlaceholder(content) {
  if (!content) return false;
  if (/^\s*-\s*$/m.test(content)) return true;
  if (TEMPLATE_PLACEHOLDER_SNIPPETS.some((snippet) => content.toLowerCase().includes(snippet.toLowerCase()))) return true;
  return TEMPLATE_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(content));
}
