# C 端视觉专项架构方案

## 影响范围

- 仅覆盖 `apps/web` C 端视觉与页面信息架构方案。
- 不改 Admin、API、DB、infra。
- 本阶段不改业务代码，不写 `docs/product/`。

潜在实现文件：

- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/articles/page.tsx`
- `apps/web/app/articles/[slug]/page.tsx`
- `apps/web/app/categories/[slug]/page.tsx`
- `apps/web/app/tags/[slug]/page.tsx`
- `apps/web/app/not-found.tsx`

## Skill 候选支撑

- `anthropics/skills@frontend-design`：支撑视觉层级、可读性、低装饰判断。
- `vercel-labs/agent-skills@web-design-guidelines`：支撑现代内容站的信息架构、页面节奏和首屏组织。
- `wshobson/agents@tailwind-design-system`：支撑 Tailwind token、spacing、utility 组织。

本轮不安装 skill。Tailwind v4 方案按 Context7 当前文档判断：优先用 CSS-first `@theme` 在 CSS 顶层组织 token，再保留少量语义 class。

## 模块边界

- 页面层：负责首页、列表、详情、分类/标签、404 的内容顺序、语义结构和空状态。
- 样式层：集中在 `globals.css`，用 token + 少量共享 utility 控制全站视觉。
- 数据层：继续使用现有 `apps/web/lib/api.ts`，不新增字段、不改接口。
- SEO 层：保留既有 metadata、Open Graph、JSON-LD、sitemap 行为。

## 方案

## 路由与页面结构

| 路由 | 结构方案 |
| --- | --- |
| `/` | 站点定位 + 最新重点文章 + 最近文章列表 + 轻量分类/标签入口。减少并排卡片和装饰背景。 |
| `/articles` | 单列 archive 列表：日期/分类、标题、摘要、标签。避免卡片墙。 |
| `/articles/[slug]` | 阅读优先：标题区、摘要、meta、标签、可选封面、AI 摘要、正文、相关内容。正文限宽。 |
| `/categories/[slug]` | 复用 archive 列表结构，标题区展示分类名/描述。 |
| `/tags/[slug]` | 复用 archive 列表结构，当前 tag 低对比 active。 |
| `not-found.tsx` | 简短说明 + 返回首页/文章列表入口，不做大面积装饰。 |

## 视觉降噪规则

- 优先用留白和字号建立层级，减少 section 线条、卡片边框、重复背景纹理。
- 普通文章用列表项，不用完整卡片；重点文章和提示块可保留浅 surface。
- 全站统一低对比分割线 token，避免多种边框色混用。
- 标签 pill 低饱和、可换行，不抢标题层级。
- 正文单栏，阅读宽度约 720-760px；列表容器约 1040-1120px。
- 移动端单列优先，检查无横向滚动、文字不遮挡、标签不挤压。

## Tailwind Token / Utility 组织

- `@theme`：定义颜色、容器、radius、字体、断点等低层 token。
- 语义变量：保留 `--background`、`--surface`、`--ink`、`--muted`、`--line`、`--accent` 供现有样式平滑迁移。
- 共享 class：保留并整理 `.site-shell`、`.page-heading`、`.article-list`、`.article-card`、`.tag`、`.empty-state` 等跨页结构。
- 不新增复杂 Tailwind config，不引入组件库。

## 鉴权与权限边界

- 所有 C 端路由均为公开访问。
- 不新增登录态、角色权限、草稿预览或受保护路由。
- 不存在内容继续使用 Next.js `notFound()` 和 `app/not-found.tsx`。

## 接口 / 数据依赖

- 文章：`listPublishedArticles()`、`getPublishedArticle(slug)`。
- 分类：`listCategories()`、`getCategory(slug)`、`listArticlesByCategory(slug)`。
- 标签：`listTags()`、`getTag(slug)`、`listArticlesByTag(slug)`。
- 不改 API schema、fallback 数据或缓存策略。

## 风险与降级

- 全局样式影响 `/about`：保留旧 class 名，逐步调整共享样式。
- 减少线条后分组不清：优先增加留白/标题层级，只恢复必要分割线。
- Tailwind token 抽象过度：先保留语义 CSS 变量，仅提升稳定 token。
- 视觉主观：以后续桌面/移动端截图清单作为验收依据。
