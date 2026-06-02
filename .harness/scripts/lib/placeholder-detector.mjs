const TEMPLATE_PLACEHOLDER_SNIPPETS = [
  "说明为什么要做这个需求",
  "一句话说明本次 run 要交付什么",
  "待 Architect Agent 补充",
  "待 Tester Agent 补充",
  "待 Release Agent 补充",
  "作为「」，我希望",
  "请先阅读 `logs/context/related-runs.md`",
  "复用的历史背景：",
  "冲突或变化：",
  "需要延续的约束：",
  "需要避开的旧问题：",
  "- 延续：",
  "- 推翻：",
  "- 新增："
];

const TEMPLATE_PLACEHOLDER_PATTERNS = [
  /\bTBD\b/i,
  /\bTODO\s*:/i,
  /\bplaceholder\s+(text|content|copy|artifact|section)\b/i,
  /\btemplate\s+placeholder\b/i,
  /模板(占位|残留|未替换|待填)/,
  /(占位符|占位文案|占位内容待替换)/,
  /(请填写|这里填写|待填写|待填入)/,
  /(待补充|待完善)/,
  /待\s+\S+\s+Agent\s+补充/i
];

export function hasTemplatePlaceholder(content) {
  if (!content) return false;
  if (/^\s*-\s*$/m.test(content)) return true;
  if (TEMPLATE_PLACEHOLDER_SNIPPETS.some((snippet) => content.includes(snippet))) return true;
  return TEMPLATE_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(content));
}
