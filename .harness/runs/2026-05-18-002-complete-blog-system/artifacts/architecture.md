# 架构和影响范围

## 当前阶段

- stage: plan
- agent: architect
- runId: 2026-05-18-002-complete-blog-system
- 本阶段边界：只更新当前 run 的 `artifacts/architecture.md` 和 `artifacts/implementation-plan.md`，不修改业务代码，不写入 `docs/product/`，不执行数据库迁移。

## 基线判断

当前代码基线已经具备上一轮 MVP 的骨架：

- `apps/web`：Next.js App Router，已有首页、文章详情页、`sitemap.ts`、`robots.ts`、基础 metadata/JSON-LD。
- `apps/admin`：React + Vite 单页后台，已有登录、文章列表、文章表单、保存草稿和发布入口。
- `apps/api`：NestJS REST API，已有公开文章列表/详情、管理端登录、管理端文章列表、创建草稿、发布文章、统一错误结构和基础 guard。
- `infra/database`：已有 SQLite SQL migration，覆盖 users、articles、categories、tags、article_tags。

因此本轮 MVP+ 不应重建技术栈，应该在现有 Next.js + React/Vite + NestJS + SQLite 边界内补全“完整博客系统能力”。

## 影响范围

- [x] web：补全 C 端信息架构、专业简约视觉、首页/列表/详情/分类/标签/关于/404、SEO/GEO 输出。
- [x] admin：补全文章编辑、状态筛选、分类标签管理、SEO/GEO 字段、表单校验和操作反馈。
- [x] api：补全公开内容接口、管理端 CRUD、分类标签接口、认证保护、错误结构和 published 过滤。
- [x] db：补全并落地 users、posts/articles、categories、tags、post_tags/article_tags、SEO/GEO 字段、slug 唯一约束。
- [ ] infra：本阶段不改部署、CI/CD 或生产配置；后续开发如改 CI 或环境变量需要单独确认。
- [x] docs：仅限当前 run 的 harness artifacts。

## 模块边界

### `apps/web`

职责：

- 面向读者的公开博客 C 端。
- 从 API 读取 published 内容，不直接暴露 draft。
- 负责页面结构、响应式布局、专业简约视觉、SEO/GEO 页面输出。

页面边界：

- `/`：站点首页，展示站点定位、最新/精选文章、分类入口、标签入口。
- `/articles`：文章列表页，按发布时间倒序展示 published 文章。
- `/articles/[slug]`：文章详情页，展示标题、摘要、正文、作者、分类、标签、发布时间、更新时间、相关文章入口。
- `/categories/[slug]`：分类文章页。
- `/tags/[slug]`：标签文章页。
- `/about`：基础站点介绍页。
- `not-found.tsx`：404 和空状态体验。

不承担：

- 管理端交互。
- 登录状态管理。
- 文章编辑。
- 数据库访问。

### `apps/admin`

职责：

- 面向管理员的内容管理后台。
- 通过 API 进行认证和管理操作。
- 负责文章、分类、标签的管理交互和表单校验。

功能边界：

- 登录和退出。
- 文章列表，支持 draft/published 筛选。
- 新建文章、编辑文章、保存草稿、发布、下架。
- 分类 CRUD。
- 标签 CRUD。
- 文章编辑字段：标题、slug、摘要、正文、封面图 URL、分类、标签、SEO 标题、SEO 描述、canonical URL、AI 摘要字段。
- Markdown textarea 作为 MVP+ 编辑方式，暂不引入富文本编辑器。

不承担：

- SEO 渲染。
- 公开页面展示。
- 复杂权限矩阵、多作者协作、媒体库。

### `apps/api`

职责：

- 提供统一 REST API。
- 隔离公开接口和管理接口。
- 保证公开接口只返回 published 内容。
- 承载认证、权限保护、数据校验、错误结构、数据库访问。

建议模块：

- `auth`：登录、当前用户、token/session 校验。
- `articles` 或 `posts`：公开文章查询、管理端文章 CRUD、发布/下架。
- `categories`：公开分类查询、管理端分类 CRUD。
- `tags`：公开标签查询、管理端标签 CRUD。
- `db`：SQLite/Drizzle 或 SQL repository 实现。
- `common`：guards、filters、errors、validation。

不承担：

- 页面渲染。
- 管理端 UI 状态。
- 生产级多租户/复杂权限。

### `infra/database`

职责：

- 保存数据库 schema/migration 说明和 SQL。
- 定义核心表、索引、唯一约束和回滚脚本。
- 后续如接入 Drizzle，应保持 migration 可从空库执行。

不承担：

- 本规划阶段不执行迁移。
- 不写生产数据库连接信息。

## 数据模型边界

建议采用下列领域命名，代码实现可沿用现有 `articles` 表，也可在 API 层统一称为 `posts`；但对外契约需要保持一致，避免一处叫 post、一处叫 article 造成漂移。

核心实体：

- `users`
  - `id`
  - `username`
  - `passwordHash`
  - `displayName`
  - `role`
  - `createdAt`
  - `updatedAt`
- `posts` / `articles`
  - `id`
  - `slug`，唯一
  - `title`
  - `summary`
  - `body`
  - `coverImage`
  - `authorId`
  - `categoryId`
  - `status`: `draft` | `published`
  - `seoTitle`
  - `seoDescription`
  - `canonicalUrl`
  - `aiSummary` 或 `contentSummary`
  - `publishedAt`
  - `createdAt`
  - `updatedAt`
- `categories`
  - `id`
  - `slug`，唯一
  - `name`
  - `description`
  - `createdAt`
  - `updatedAt`
- `tags`
  - `id`
  - `slug`，唯一
  - `name`
  - `createdAt`
  - `updatedAt`
- `post_tags` / `article_tags`
  - `postId` / `articleId`
  - `tagId`
  - 复合主键。

约束：

- 文章、分类、标签 slug 必须唯一。
- 公开查询默认过滤 `status = published`。
- 每篇文章最多一个主分类。
- 每篇文章可绑定多个标签。
- 文章删除或下架不得破坏分类/标签数据。

## API 边界

### 公开接口

- `GET /api/health`
- `GET /api/articles`
  - 返回 published 文章摘要列表。
  - 支持后续扩展分页、分类、标签过滤。
- `GET /api/articles/:slug`
  - 返回 published 文章详情。
  - draft 返回 404，不暴露存在性。
- `GET /api/categories`
- `GET /api/categories/:slug/articles`
- `GET /api/tags`
- `GET /api/tags/:slug/articles`

### 管理接口

- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET /api/admin/articles?status=draft|published`
- `POST /api/admin/articles`
- `GET /api/admin/articles/:id`
- `PATCH /api/admin/articles/:id`
- `POST /api/admin/articles/:id/publish`
- `POST /api/admin/articles/:id/unpublish`
- `DELETE /api/admin/articles/:id`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `GET /api/admin/tags`
- `POST /api/admin/tags`
- `PATCH /api/admin/tags/:id`
- `DELETE /api/admin/tags/:id`

错误结构保持稳定：

```json
{
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "Article not found",
    "details": {}
  }
}
```

## C 端专业简约设计原则

- 内容优先：首屏应直接传达站点主题、最新内容和主要分类，不做营销型大 hero。
- 视觉克制：使用少量中性色、清晰分隔线、稳定留白、8px 以内圆角；避免一眼看成装饰站。
- 排版稳定：正文区域使用可读行宽，标题层级清晰，列表信息密度适中。
- 导航明确：首页、文章、分类、标签、关于页可被快速发现。
- 移动端优先可读：不横向溢出，列表卡片和正文段落不挤压，导航可操作。
- 状态完整：空列表、404、加载失败都提供简洁反馈和返回入口。
- 可访问性：语义化标题、可聚焦链接、合理对比度、图片 alt、表单 label 明确。

## SEO/GEO 策略

这里的 GEO 按 Generative Engine Optimization 理解，而非地理定位。

SEO：

- 每个公开页面生成稳定 title 和 description。
- 文章详情优先使用 `seoTitle`、`seoDescription`，缺省回退到标题和摘要。
- 文章详情输出 canonical URL、Open Graph article 元信息。
- 站点提供 sitemap 和 robots。
- draft 内容不得进入 sitemap。

GEO：

- 文章详情页使用语义化 HTML：`article`、`header`、标题层级、时间、作者、分类、标签。
- 每篇文章保存 `aiSummary` 或 `contentSummary`，用于生成式搜索摘要。
- 文章详情输出 JSON-LD `BlogPosting`，包含 headline、description、datePublished、dateModified、author、publisher、keywords、mainEntityOfPage。
- 分类和标签页应有明确标题、描述和可抓取文章列表。
- 后续可扩展 LLM 可读 sitemap、FAQ/问答摘要、实体知识卡片，但不进入 MVP+。

## 方案

本轮 MVP+ 采用“现有骨架上补全能力”的方案：

1. 保持 `apps/web`、`apps/admin`、`apps/api` 三应用分离。
2. `apps/web` 专注公开读者体验和 SEO/GEO，不接收管理员状态。
3. `apps/admin` 专注内容管理，不承担公开渲染。
4. `apps/api` 作为唯一数据和权限边界，公开接口与管理接口分离。
5. 数据库从“已有 migration 说明”推进为后续开发可实际接入的 repository，实现持久化替换当前内存 repository。
6. 先补全数据模型和 API 契约，再并行推进 C 端页面和管理后台，最后由 tester/reviewer/release 做验证、评审和发布摘要。

建议优先级：

- P0：持久化、文章 CRUD、published 过滤、分类/标签、C 端页面完整性、管理端基础操作。
- P1：SEO/GEO 字段、JSON-LD、sitemap 过滤、表单体验、错误反馈。
- P2：相关文章入口、封面图 URL 展示、关于页内容占位优化。

## 风险

- 当前 API 仍以 in-memory repository 为主，若不先落地数据库 repository，管理端保存结果无法形成真实产品闭环。
- 现有数据库 migration 与 API 类型不完全一致，例如 `category_id`、`seo_*` 在 SQL 中已有，但 API 类型和管理表单尚未完全覆盖。
- `articles` 与需求中的 `posts` 命名需要统一，否则后续前后端契约容易漂移。
- 管理端目前是单文件主应用，继续扩展会变得难维护；后续开发应先拆出 API client、路由/视图、表单组件。
- 认证目前适合 MVP，但如果用户要求更正式认证，会扩大到密码哈希、token 过期、刷新或 session 管理。
- Markdown 渲染目前偏轻量，若要支持完整 Markdown 语法和安全 HTML，需要引入解析与净化策略。
- RSS、搜索、评论、媒体库、多作者都已放入后续迭代，不应在 MVP+ 开发中顺手加入。
- 数据库迁移属于高风险操作，后续进入开发时必须由 database agent 单独提出迁移和回滚方案，并经用户确认后执行。

## 待用户确认

- MVP+ 是否按个人博客处理，暂不支持多作者协作。
- 认证是否接受 MVP 级账号密码 + token/session，生产级会话管理后置。
- 正文编辑是否确认使用 Markdown textarea，富文本编辑器后置。
- 封面图是否仅保存 URL，图片上传和媒体库后置。
- RSS/Atom 和站内搜索是否继续放入后续迭代。
- GEO 是否确认按 Generative Engine Optimization 处理。
- 本轮开发目标是否为本地可运行 MVP+，暂不包含生产部署自动化。
