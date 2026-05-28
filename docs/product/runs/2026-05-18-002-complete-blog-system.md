# 002 完善博客系统 MVP

- run: `2026-05-18-002-complete-blog-system`
- 日期: 2026-05-18

## 产品摘要

- C 端 Web 补全专业简约博客体验：首页重点文章、继续阅读、文章列表、文章详情、分类页、标签页、关于页、404、导航、页脚、sitemap、SEO/GEO metadata 和 JSON-LD。
- Admin 补全后台管理路由闭环：登录页、受保护路由、登录后回跳、会话恢复、退出、仪表盘、文章列表、文章编辑页、分类页、标签页和操作反馈。
- API 补全 MVP+ REST 契约：公开分类/标签接口、按分类/标签查询文章、管理端当前用户、文章更新/下架、分类/标签管理。
- 数据库 migration 补齐 MVP+ 字段：作者、分类描述、SEO/GEO 字段、canonical、AI/content summary、slug 唯一约束和查询索引。
- 测试扩展到 14 个 API e2e 用例，覆盖公开过滤、分类标签、认证保护、文章更新/发布/下架和分类标签创建。

## 用户影响

- 读者可以通过更完整的 C 端路径浏览内容：最新文章、文章列表、分类、标签、文章详情和关于页。
- 管理员登录后进入受保护后台，可以通过独立模块路由维护文章、分类、标签、SEO/GEO 字段和发布状态。
- 未发布文章不会出现在公开 API 和 C 端页面。
- 本轮不包含评论、搜索、RSS、订阅、多作者、媒体库、富文本和生产部署自动化。

## 验证和质量

暂无验证记录。

## 阻塞项

暂无阻塞项记录。

## 下一步

暂无下一步记录。

## 原始需求

## 背景

上一版 MVP 已经定义了个人博客的基础能力：C 端文章浏览、管理端文章编辑、后端 API、数据库模型和基础 CI。本轮希望在上一版基础上，进一步细化为一个更完整、更接近真实可用产品的博客系统需求。

用户明确要求：先做需求细化、验收标准和设计方案，不进入开发。

## 目标

- 完善博客系统的整体能力边界，覆盖 C 端读者体验、内容组织、管理后台、API、数据模型、SEO/GEO、测试和发布边界。
- 明确 C 端 Web 的产品气质：专业、简约、内容优先。
- 产出可供人工审核的需求说明、验收标准、设计方案和实施计划。
- 为后续开发阶段拆分前端、后端、数据库、测试等 agent 任务提供依据。

## 非目标

- 本轮不写业务代码。
- 本轮不修改 `docs/product/`。
- 本轮不执行数据库迁移、部署、CI/CD 或生产配置。
- 本轮不直接归档为 done。

## 初始需求

- 完善之前的 MVP 版本。
- 目标是一个完整的博客系统能力。
- Web C 端需要专业但简约的风格。
- 先分配 agent 做需求细化、验收标准和设计方案，等待人工审核后再决定是否继续开发。

## 验收标准

- [ ] `artifacts/requirement.md` 清晰描述完整博客系统能力、目标用户、目标、非目标和验收标准。
- [ ] `artifacts/architecture.md` 给出影响范围、系统边界、关键模块方案和风险。
- [ ] `artifacts/implementation-plan.md` 给出后续开发阶段的拆分步骤、agent 分工建议、测试计划和完成检查。
- [ ] C 端专业简约风格被转化为可执行的页面、信息架构、交互和视觉约束。
- [ ] 明确哪些能力进入本次完善版，哪些留到后续迭代。
- [ ] 本轮不修改业务代码，不修改 `docs/product/`。

## 影响范围

- [x] web
- [x] admin
- [x] api
- [x] db
- [ ] infra
- [x] docs

## 测试要求

- 本轮为规划阶段，不运行应用测试。
- 需要运行 harness 结构检查。
- 后续实施计划必须包含 C 端页面验收、后台内容管理验收、API 验收、数据库验收和回归测试建议。

## 回滚方式

- 本轮只写入 `.harness/backlog/ready/` 和 `.harness/runs/<run>/artifacts/`。
- 如需回滚，删除本任务对应 run 或 revert 本轮 harness 文档变更即可。

## 需求摘要

## 背景

上一轮博客 MVP 已经定义了个人博客的最小闭环：C 端文章列表与详情、管理端登录与文章编辑、后端 API、基础数据模型和基础工程检查。本轮需求是在 MVP 基础上完善为更接近真实可用产品的完整博客系统能力。

用户明确要求本阶段只做需求细化、验收标准和设计方案，不进入开发；因此本文件作为 requirements agent 的规划产物，只写入 `.harness/runs/2026-05-18-002-complete-blog-system/artifacts/requirement.md`，不修改业务代码，不写入 `docs/product/`。

本轮关键词是：

- 完整博客系统能力。
- Web C 端专业但简约。
- 先规划、审核后再开发。

## 目标

- 明确 MVP+ 阶段必须完成的博客系统能力边界，避免把“完整博客系统”一次性扩张到过大的产品范围。
- 将 C 端“专业但简约风”转化为可验收的信息架构、页面、视觉、响应式、可访问性、SEO/GEO 要求。
- 补全内容组织能力，包括文章、分类、标签、作者、发布状态、摘要、封面、SEO/GEO 元信息。
- 补全管理后台能力，包括登录、文章列表、文章创建/编辑、草稿、发布、分类标签管理、内容预览和基础校验。
- 明确 API、数据模型、测试、发布和回滚边界，为后续 frontend、backend、database、tester、reviewer agent 开发阶段提供依据。
- 保持本轮为规划阶段，待用户审核确认后再进入开发。

### MVP+ 必做

- C 端 Web：
  - 首页展示品牌/站点名称、导航、精选或最新文章、分类入口、标签入口和基础页脚。
  - 文章列表页支持按时间倒序展示已发布文章。
  - 文章详情页展示标题、摘要、发布时间、更新时间、作者、分类、标签、正文和相关文章入口。
  - 分类页展示某分类下的文章列表。
  - 标签页展示某标签下的文章列表。
  - 关于页或站点介绍页提供博客定位、作者/团队简介和联系入口占位。
  - 404/空状态页面具备简洁反馈和返回入口。
- C 端专业简约体验：
  - 内容优先，正文阅读区域清晰，避免过度装饰。
  - 桌面端具备稳定的导航、内容宽度和层级排版。
  - 移动端可顺畅阅读，导航、列表、文章正文不横向溢出。
  - 颜色、字号、间距、卡片和边框保持克制，整体偏专业内容站，不做营销型大视觉。
  - 页面具备基础可访问性，包括语义化标题、键盘可访问链接、合理对比度、图片 alt 文本。
- 内容组织：
  - 文章支持标题、slug、摘要、正文、封面图 URL、作者、状态、发布时间、更新时间。
  - 文章状态至少支持 draft、published。
  - 分类支持名称、slug、描述。
  - 标签支持名称、slug。
  - 文章与标签支持多对多关系。
  - 每篇文章必须最多归属一个主分类，可以有多个标签。
- SEO/GEO：
  - 每篇文章支持 SEO 标题、SEO 描述、canonical URL 占位。
  - 每篇文章支持面向生成式搜索/AI 摘要的结构化摘要字段，例如 `aiSummary` 或 `contentSummary`。
  - C 端页面具备标题、描述、Open Graph 基础元信息。
  - 文章详情页预留 JSON-LD 或结构化数据设计位。
- 管理后台：
  - 管理员可以登录后台。
  - 管理员可以查看文章列表，并按状态筛选 draft/published。
  - 管理员可以创建文章、编辑文章、保存草稿、发布文章、下架文章。
  - 管理员可以维护分类和标签的基础信息。
  - 表单必须有必填校验和保存/发布反馈。
  - 内容编辑 MVP+ 使用 Markdown textarea 或等价轻量编辑方式，不要求富文本编辑器。
- API：
  - 提供公开文章列表、公开文章详情、分类列表、标签列表、分类文章列表、标签文章列表接口。
  - 提供管理端登录、当前用户、文章 CRUD、发布/下架、分类 CRUD、标签 CRUD 接口。
  - 公开接口只返回 published 内容。
  - 管理接口需要认证保护。
  - 错误响应结构稳定，至少包含错误码或错误类型、message。
- 数据模型：
  - 支持 users、posts、categories、tags、post_tags 等核心表或等价结构。
  - slug 必须唯一，适用于文章、分类、标签。
  - publishedAt 与 updatedAt 可用于前台排序和展示。
  - 数据模型为后续评论、搜索、媒体库预留扩展空间，但本轮不实现。
- 测试与质量：
  - 后续开发阶段必须覆盖 C 端关键页面、管理端关键流程、API 权限与数据过滤、数据模型迁移和基础回归。

### 后续迭代

- 评论系统、评论审核、反垃圾。
- 全文搜索、搜索结果页、搜索建议。
- RSS/Atom feed。
- 订阅能力，包括邮件订阅或站内订阅。
- 多作者协作、角色权限矩阵、审稿流程。
- 富文本编辑器、图片上传、媒体库、图片裁剪和 CDN。
- 文章版本历史、自动保存、内容差异比较。
- 访问统计、阅读量、热门文章、推荐系统。
- 归档页、系列专题、作者页。
- 国际化、多语言内容。
- 正式生产部署自动化、监控、备份和告警。
- 更高级 GEO 能力，例如 LLM 可读 sitemap、问答摘要、实体结构化知识卡片。

## 非目标

- 本阶段不写业务代码。
- 本阶段不修改 `docs/product/`。
- 本阶段不执行数据库迁移。
- 本阶段不修改 CI/CD、生产配置、密钥或部署环境。
- 本阶段不直接归档 done。
- MVP+ 不实现评论、搜索、订阅、访问统计、媒体库、富文本编辑器、多作者协作、复杂权限和生产级部署自动化。
- MVP+ 不追求复杂视觉品牌系统，不做营销落地页，不做重装饰或大面积插画式首页。
- MVP+ 不承诺生产级安全合规，只要求后续开发阶段提供合理的认证、权限保护和基础安全边界。

## 用户故事

- 作为读者，我希望打开博客首页时快速理解这个博客的主题、最新内容和主要分类，以便决定继续阅读什么。
- 作为读者，我希望文章列表清晰展示标题、摘要、发布时间、分类和标签，以便快速筛选感兴趣内容。
- 作为读者，我希望文章详情页排版舒适、干扰少、移动端可读，以便专注阅读正文。
- 作为读者，我希望通过分类和标签查看相关内容，以便围绕主题继续探索。
- 作为读者，我希望遇到空列表或不存在页面时获得清晰反馈和返回入口，以便不迷路。
- 作为管理员，我希望登录后台后看到文章状态和内容概览，以便知道哪些文章待编辑、已发布或需要下架。
- 作为管理员，我希望创建和编辑 Markdown 文章，并保存草稿，以便逐步完善内容。
- 作为管理员，我希望发布、下架文章，并确认只有已发布文章出现在 C 端，以便控制公开内容。
- 作为管理员，我希望维护分类和标签，以便让内容组织更清晰。
- 作

...（已截断，完整内容见 run artifacts）

## 实施计划摘要

## 任务摘要

在现有博客 MVP 骨架上补全 MVP+ 博客系统能力：C 端形成专业简约的完整阅读体验，管理后台支持文章、分类、标签和 SEO/GEO 字段管理，API 补齐公开/管理接口和持久化边界，数据库模型支撑真实内容组织。本阶段只输出实施计划，不进入开发。

## 本阶段边界

- 只更新当前 run 的 `artifacts/architecture.md` 和 `artifacts/implementation-plan.md`。
- 不修改 `apps/web`、`apps/admin`、`apps/api`、`infra/database` 的业务代码。
- 不修改 `docs/product/`。
- 不执行数据库迁移、依赖安装、服务启动、部署或 CI/CD 修改。
- 后续开发必须在用户审核本方案并明确说“继续开发”后再启动。

## 文件和模块

后续开发预计涉及：

- `apps/web/app/**`
  - 首页、文章列表、文章详情、分类页、标签页、关于页、404。
  - `sitemap.ts`、`robots.ts`、metadata、JSON-LD。
- `apps/web/lib/**`
  - API client、站点配置、SEO/GEO helper。
- `apps/web/app/globals.css`
  - 专业简约 C 端视觉系统、响应式和阅读排版。
- `apps/admin/src/**`
  - 登录、文章列表、文章编辑、分类管理、标签管理、API client、表单校验、反馈状态。
- `apps/api/src/**`
  - auth、articles/posts、categories、tags、db、common filters/guards/errors/dto。
- `infra/database/**`
  - SQL migration、down migration、README、seed 说明；如接入 Drizzle，则增加 schema/config。
- `package.json` 和各 workspace `package.json`
  - 仅在确实需要新增依赖或脚本时修改。
- `.harness/runs/2026-05-18-002-complete-blog-system/artifacts/**`
  - 后续测试、评审、发布摘要。

本阶段不得涉及：

- `docs/product/**`
- `.env`、`.env.*`
- 生产部署配置、密钥、真实数据库连接。

## 后续开发拆分顺序

建议后续由主 agent 按以下顺序委派：

1. `database`
   - 确认并补齐数据模型、migration、down migration、seed 方案。
   - 输出 `db-migration.md`，等待用户确认后再执行迁移。
2. `backend`
   - 基于确认后的模型补齐 NestJS modules、DTO、repository、公开/管理接口、认证保护、错误结构。
3. `frontend`
   - 分两条线推进：
     - `web`：C 端页面、专业简约视觉、SEO/GEO。
     - `admin`：内容管理、分类标签管理、表单校验和反馈。
4. `tester`
   - 执行 API、C 端页面、管理端流程、数据库、SEO/GEO 和回归验证。
5. `reviewer`
   - 审查代码风险、范围漂移、迁移风险、测试缺口、是否满足验收标准。
6. `release`
   - 写 `release-summary.md`、回滚说明、产品沉淀建议。
7. `main`
   - 汇总给用户审核，用户确认后再考虑归档或同步 `docs/product/`。

## 步骤

### 1. Database Agent

- 对齐命名：确认继续使用 `articles/article_tags`，还是迁移为 `posts/post_tags`。建议为降低改动沿用现有 `articles` 命名，对外文案称“文章”。
- 补齐 `articles` 字段：
  - `author_id`
  - `canonical_url`
  - `ai_summary` 或 `content_summary`
  - 如现有 migration 缺 `categories.description`，需要补齐。
- 保留并验证：
  - `users.username` 唯一。
  - `articles.slug` 唯一。
  - `categories.slug` 唯一。
  - `tags.slug` 唯一。
  - `article_tags` 复合主键。
  - `articles.status`、`published_at`、`category_id` 索引。
- 准备 seed：
  - 1 个管理员。
  - 2 篇 published 文章。
  - 1 篇 draft 文章。
  - 至少 2 个分类和 3 个标签。
- 提供 down migration 或清晰手动回滚步骤。
- 本步骤涉及数据库迁移，高风险，执行前必须让用户确认。

### 2. Backend Agent

- 将当前 in-memory repository 替换或包裹为可持久化 repository。
- 补齐文章类型和 DTO：
  - `categoryId`
  - `tagIds` 或 tags slug 列表。
  - `seoTitle`
  - `seoDescription`
  - `canonicalUrl`
  - `aiSummary`
  - `coverImage`
- 补齐公开接口：
  - `GET /api/articles`
  - `GET /api/articles/:slug`
  - `GET /api/categories`
  - `GET /api/categories/:slug/articles`
  - `GET /api/tags`
  - `GET /api/tags/:slug/articles`
- 补齐管理接口：
  - `GET /api/admin/me`
  - `GET /api/admin/articles?status=...`
  - `POST /api/admin/articles`
  - `GET /api/admin/articles/:id`
  - `PATCH /api/admin/articles/:id`
  - `POST /api/admin/articles/:id/publish`
  - `POST /api/admin/articles/:id/unpublish`
  - category/tag CRUD。
- 保证公开接口只返回 `published`。
- 保持统一错误结构。
- 增加 e2e 或 service 测试，覆盖权限、pu

...（已截断，完整内容见 run artifacts）