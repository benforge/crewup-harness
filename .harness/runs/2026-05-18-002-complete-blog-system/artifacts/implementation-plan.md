# 实施计划

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
- 增加 e2e 或 service 测试，覆盖权限、published 过滤、slug 冲突、分类标签关联。

### 3. Frontend Agent - Web

- 补齐页面：
  - `/`
  - `/articles`
  - `/articles/[slug]`
  - `/categories/[slug]`
  - `/tags/[slug]`
  - `/about`
  - `not-found.tsx`
- 首页信息架构：
  - 站点名称和定位。
  - 最新/精选文章。
  - 分类入口。
  - 标签入口。
  - 简洁页脚。
- 文章详情：
  - 标题、摘要、正文、作者、分类、标签、发布时间、更新时间。
  - 相关文章入口可先按同分类或同标签取少量文章。
  - JSON-LD `BlogPosting`。
- 专业简约视觉：
  - 内容站风格，克制颜色和边框。
  - 清晰阅读行宽。
  - 响应式不横向溢出。
  - 不做营销型大 hero，不做重装饰。
- SEO/GEO：
  - title、description、canonical、Open Graph。
  - sitemap 只包含 published 内容。
  - 分类/标签页提供可抓取标题和描述。

### 4. Frontend Agent - Admin

- 拆分当前单文件后台：
  - API client。
  - auth/session helper。
  - article list view。
  - article editor view。
  - category management view。
  - tag management view。
  - shared form components。
- 文章列表：
  - draft/published 筛选。
  - 标题、状态、分类、更新时间、发布时间。
- 文章编辑：
  - 标题、slug、摘要、正文、封面图 URL、分类、标签。
  - SEO 标题、SEO 描述、canonical URL、AI 摘要。
  - 保存草稿、发布、下架。
- 分类/标签：
  - 创建、编辑、删除或禁用删除。
  - slug 冲突反馈。
- 表单反馈：
  - 必填校验。
  - 保存中状态。
  - 成功/失败反馈。
  - 未登录或 token 失效反馈。

### 5. Tester Agent

- 运行结构和工程检查：
  - `npm run harness:check`
  - `npm run typecheck --workspaces --if-present`
  - `npm run test --workspaces --if-present`
  - `npm run build --workspaces --if-present`
- API 测试：
  - published 列表不包含 draft。
  - draft 详情公开访问返回 404。
  - 未认证管理接口被拒绝。
  - 登录成功/失败。
  - 文章 CRUD、发布、下架。
  - 分类/标签 CRUD。
  - slug 冲突错误结构稳定。
- C 端测试：
  - 首页、文章列表、文章详情、分类、标签、关于、404 可访问。
  - 桌面和移动端无横向溢出。
  - 文章详情显示完整元信息。
  - metadata、Open Graph、JSON-LD、sitemap、robots 存在。
- 管理端测试：
  - 登录后可查看文章。
  - 可创建草稿、编辑、发布、下架。
  - 分类和标签可维护并关联文章。
- 数据库测试：
  - 空库可初始化。
  - down migration 或回滚说明可执行/可理解。
  - seed 数据可支持本地 smoke。

### 6. Reviewer Agent

- 检查是否发生范围漂移：
  - 评论、搜索、RSS、订阅、媒体库、富文本、多作者不得误入 MVP+。
- 检查高风险项：
  - 数据库迁移是否已获用户确认。
  - 是否修改 `.env`、生产配置、CI/CD。
  - 是否直接写入 `docs/product/`。
- 检查架构一致性：
  - articles/posts 命名是否统一。
  - API response 是否稳定。
  - 前台是否只展示 published。
  - 后台是否只通过管理接口操作。
- 检查测试缺口并给出阻塞/非阻塞结论。

### 7. Release Agent

- 仅在测试和评审通过后执行。
- 更新 `artifacts/release-summary.md`。
- 说明：
  - 完成内容。
  - 变更文件范围。
  - 测试结果。
  - 数据库迁移和回滚。
  - 已知限制。
  - 后续迭代建议。
- 不直接写 `docs/product/`；是否 product sync 由主 agent 在用户确认后执行。

## 风险

- 数据库迁移和持久化替换是最大风险，应先由 database agent 单独处理并经用户确认。
- 当前 API 的 in-memory repository 与 SQL migration 有差距，可能导致类型、字段和测试需要同步调整。
- 管理后台现有单文件实现继续堆功能会失控，应先拆分模块再扩展。
- SEO/GEO 字段如果只做数据库字段而没有贯穿 API、admin、web，会出现“可保存但不可展示”的半成品。
- C 端“专业简约”如果没有桌面/移动截图验证，容易只停留在 CSS 主观判断。
- 认证强度仍有待确认；生产级密码哈希和 session 生命周期会扩大范围。
- 若用户要求可部署环境，infra 范围会从当前非目标变为正式需求，需要重新确认。

## 测试计划

本阶段测试：

- 不运行应用测试。
- 不启动服务。
- 不执行数据库迁移。
- 只做 harness 结构检查和文档标题检查。

后续开发测试：

- `npm run harness:check`
- `npm run typecheck --workspaces --if-present`
- `npm run test --workspaces --if-present`
- `npm run build --workspaces --if-present`
- API e2e：公开 published 过滤、管理认证、文章 CRUD、发布/下架、分类标签 CRUD。
- Web 验证：页面可访问、响应式、metadata、JSON-LD、sitemap、robots。
- Admin 验证：登录、文章编辑、状态筛选、分类标签管理、错误反馈。
- DB 验证：空库迁移、seed、唯一约束、down migration 或手动回滚。
- 回归验证：上一轮 MVP 的首页、文章详情、后台登录、保存草稿、发布能力不退化。

## 完成检查

本阶段：

- [x] 已阅读 run 输入、architect task、requirements artifact 和上一轮 MVP 方案。
- [x] 已对照当前 `apps/web`、`apps/admin`、`apps/api`、`infra/database` 基线。
- [x] 已明确影响范围。
- [x] 已明确模块边界。
- [x] 已明确 C 端专业简约设计原则。
- [x] 已明确数据模型/API 边界。
- [x] 已明确 SEO/GEO 策略。
- [x] 已明确后续 agent 拆分顺序。
- [x] 已明确本阶段不开发、不写 `docs/product/`、不迁移数据库。

后续开发进入前：

- [ ] 用户确认需求、架构和实施计划。
- [ ] 用户确认是否继续按个人博客、Markdown textarea、封面图 URL、RSS/搜索后置、GEO=Generative Engine Optimization。
- [ ] 如涉及数据库迁移，用户先确认 database agent 的迁移与回滚方案。

最终 done 前：

- [ ] 需求验收标准通过。
- [ ] 测试通过或已有合理说明。
- [ ] 评审无阻塞问题。
- [ ] 发布摘要已更新。
- [ ] 用户确认是否归档和是否同步 `docs/product/`。
