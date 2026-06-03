import { stripNegatedScopeText } from "./scope-negation.mjs";

const fallbackMaxLength = 80;

export function semanticTitleFromText(input) {
  const text = normalizeText(input);
  if (!text) return null;
  const action = detectAction(text);
  const object = detectObject(text);
  if (action?.title && object?.title) return `${action.title}${object.title}`;
  return titleFromFirstLine(text);
}

export function semanticSlugFromText(input, fallback = "untitled-task") {
  const text = normalizeText(input);
  const action = detectAction(text);
  const object = detectObject(text);
  const parts = [];
  if (action?.slug) parts.push(action.slug);
  if (object?.slug) parts.push(object.slug);
  const semantic = parts.join("-");
  if (semantic) return semantic;
  return slugify(fallback === "untitled-task" ? titleFromFirstLine(text) : fallback) || fallback;
}

export function slugify(input, { maxLength = fallbackMaxLength } = {}) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength)
    .replace(/-$/g, "");
}

export function stripLeadingSequence(name) {
  return String(name ?? "").replace(/^\d+-/, "");
}

export function leadingSequence(name) {
  return /^(\d+)-/.exec(String(name ?? ""))?.[1] ?? "";
}

function normalizeText(input) {
  return String(input ?? "").trim();
}

function effectiveText(input) {
  return stripNegatedScopeText(input).toLowerCase();
}

function titleFromFirstLine(text) {
  const firstLine = text.split(/\r?\n/).find(Boolean);
  if (!firstLine) return null;
  return firstLine
    .replace(/^#+\s*/, "")
    .replace(/^\u73b0\u5728(\u76f4\u63a5)?(\u5e2e\u6211)?(\u505a|\u5b9e\u73b0|\u5904\u7406)[:\uff1a]?\s*/, "")
    .replace(/^\u4f7f\u7528\s*CrewUp\s*/i, "")
    .trim()
    .slice(0, 40);
}

function detectAction(text) {
  const lower = effectiveText(text);
  if (/(\u53ea\u89c4\u5212|\u53ea\u505a\u89c4\u5212|\u53ea\u505a\u9700\u6c42|\u53ea\u505a\u67b6\u6784|\u5148\u89c4\u5212|\u5148\u4e0d\u8981\u5199\u4ee3\u7801|\u4e0d\u5199\u4ee3\u7801|\u4e0d\u8981\u5199\u4ee3\u7801|plan-only|planning only|do not write code|no code)/i.test(lower)) {
    return { slug: "plan", title: "\u89c4\u5212" };
  }
  if (/(\u5b9e\u73b0|\u5f00\u53d1|\u65b0\u589e|\u521b\u5efa|\u642d\u5efa|\u505a|build|implement|create|add)/i.test(lower)) {
    return { slug: "build", title: "\u5b9e\u73b0" };
  }
  if (/(\u4fee\u590d|bug|\u62a5\u9519|\u5931\u8d25|fix|repair)/i.test(lower)) return { slug: "fix", title: "\u4fee\u590d" };
  if (/(\u4f18\u5316|\u6539\u8fdb|\u6539\u5584|refactor|improve|optimize)/i.test(lower)) return { slug: "improve", title: "\u4f18\u5316" };
  if (/(\u6587\u6863|readme|docs?|\u8bf4\u660e|\u6307\u5357|document)/i.test(lower)) return { slug: "docs", title: "\u66f4\u65b0" };
  if (/(\u89c4\u5212|\u8ba1\u5212|\u8bbe\u8ba1|\u6280\u672f\u9009\u578b|\u76ee\u5f55\u7ed3\u6784|\u6a21\u5757\u8fb9\u754c|\u9636\u6bb5\u62c6\u5206|plan|design)/i.test(lower)) {
    return { slug: "plan", title: "\u89c4\u5212" };
  }
  return null;
}

function detectObject(text) {
  const lower = effectiveText(text);
  const candidates = [
    [/counter|\u8ba1\u6570\u5668/i, { slug: "counter-web-app", title: "Counter Web App" }],
    [/\u5168\u6808\u535a\u5ba2\u7cfb\u7edf|fullstack blog|full-stack blog/i, { slug: "fullstack-blog-system", title: "\u5168\u6808\u535a\u5ba2\u7cfb\u7edf" }],
    [/\u535a\u5ba2\u7cfb\u7edf|blog system|blog/i, { slug: "blog-system", title: "\u535a\u5ba2\u7cfb\u7edf" }],
    [/\u7528\u6237\u8ba4\u8bc1|\u767b\u5f55|\u6ce8\u518c|auth|authentication|login/i, { slug: "auth", title: "\u8ba4\u8bc1" }],
    [/\u540e\u53f0\s*api|\u540e\u7aef\s*api|backend api|api/i, { slug: "backend-api", title: "\u540e\u7aef API" }],
    [/admin|\u540e\u53f0/i, { slug: "admin", title: "Admin \u540e\u53f0" }],
    [/\u6570\u636e\u5e93|database|schema|db/i, { slug: "database", title: "\u6570\u636e\u5e93" }],
    [/\u524d\u53f0|\u524d\u7aef|frontend|web/i, { slug: "frontend", title: "\u524d\u7aef" }],
    [/readme/i, { slug: "readme", title: "README" }],
    [/\u542f\u52a8|startup|start/i, { slug: "startup-guide", title: "\u542f\u52a8\u8bf4\u660e" }]
  ];
  return candidates.find(([pattern]) => pattern.test(lower))?.[1] ?? null;
}
