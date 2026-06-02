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

function titleFromFirstLine(text) {
  const firstLine = text.split(/\r?\n/).find(Boolean);
  if (!firstLine) return null;
  return firstLine
    .replace(/^#+\s*/, "")
    .replace(/^现在(直接)?(帮我)?(做|实现|处理)[:：]?\s*/, "")
    .replace(/^使用\s*CrewUp\s*/i, "")
    .trim()
    .slice(0, 40);
}

function detectAction(text) {
  const lower = text.toLowerCase();
  if (/(规划|计划|设计|技术选型|目录结构|模块边界|阶段拆分|验收标准|plan|design)/i.test(lower)) {
    return { slug: "plan", title: "规划" };
  }
  if (/(修复|bug|报错|失败|fix|repair)/i.test(lower)) return { slug: "fix", title: "修复" };
  if (/(优化|改进|改善|refactor|improve|optimize)/i.test(lower)) return { slug: "improve", title: "优化" };
  if (/(文档|readme|docs?|说明|指南|document)/i.test(lower)) return { slug: "docs", title: "更新" };
  if (/(实现|开发|新增|创建|搭建|build|implement|create|add)/i.test(lower)) return { slug: "build", title: "实现" };
  return null;
}

function detectObject(text) {
  const lower = text.toLowerCase();
  const candidates = [
    [/全栈博客系统|fullstack blog|full-stack blog/i, { slug: "fullstack-blog-system", title: "全栈博客系统" }],
    [/博客系统|blog system|blog/i, { slug: "blog-system", title: "博客系统" }],
    [/用户认证|登录|注册|auth|authentication|login/i, { slug: "auth", title: "认证" }],
    [/后台\s*api|后端\s*api|backend api|api/i, { slug: "backend-api", title: "后端 API" }],
    [/admin|后台/i, { slug: "admin", title: "Admin 后台" }],
    [/数据库|database|schema|db/i, { slug: "database", title: "数据库" }],
    [/前台|前端|frontend|web/i, { slug: "frontend", title: "前端" }],
    [/readme/i, { slug: "readme", title: "README" }],
    [/启动|startup|start/i, { slug: "startup-guide", title: "启动说明" }]
  ];
  return candidates.find(([pattern]) => pattern.test(lower))?.[1] ?? null;
}
