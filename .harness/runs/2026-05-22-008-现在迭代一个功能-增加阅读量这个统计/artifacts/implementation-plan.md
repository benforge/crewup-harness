# 实施计划

## 任务摘要

为博客文章增加统一的 `viewCount` 阅读量统计：公开文章详情页成功渲染后由浏览器端触发计数，C 端展示阅读量，后台文章列表或 Dashboard 展示阅读量，并补齐 API/types/SDK/Web/Admin/DB 迁移边界。

## 文件和模块

- `apps/api/src/articles/types/article.types.ts`：在 `Article`/`ArticleSummary`/`ArticleDetail` 链路加入 `viewCount: number`。
- `apps/api/src/articles/repositories/article.repository.ts`：增加阅读量自增 repository 契约。
- `apps/api/src/articles/repositories/in-memory-article.repository.ts`：为种子文章、新建文章和更新流转补齐 `viewCount` 默认值与自增实现。
- `apps/api/src/articles/articles.service.ts`：在 `toSummary`/`toDetail` 输出 `viewCount`，新增只对已发布文章计数的 service 方法。
- `apps/api/src/articles/controllers/public-articles.controller.ts`：新增公开 `POST /api/articles/:slug/view`，保留 `GET /api/articles/:slug` 为纯读取。
- `packages/types/src/index.js`：在文章 schema 中增加 `viewCount`，并新增计数接口响应 schema 或复用最小响应 schema。
- `packages/sdk/src/index.js`：同步解析新增字段，必要时增加 `recordArticleView(slug)` 方法。
- `apps/web/lib/api.ts`：Article 类型、fallback 数据、normalize 缺省、计数请求方法同步 `viewCount`。
- `apps/web/app/articles/[slug]/page.tsx`：展示阅读量，引入只在真实 API 文章详情渲染后触发的 client 计数组件。
- `apps/web/components/article/*` 或新增组件：承载阅读量展示/计数局部状态；若列表也展示，确保与详情同一字段来源。
- `apps/admin/src/main.tsx`：Admin `ArticleSummary` 类型、文章列表列或 Dashboard 指标展示 `viewCount`，不加入可编辑表单。
- `infra/database/migrations/0002_add_article_view_count.sql`：新增 `articles.view_count` 持久化列，默认 `0`，非负约束，并记录回滚方式。
- `apps/api/test/app.e2e-spec.ts`：覆盖字段返回、公开详情 GET 不计数、公开 POST 计数、草稿/不存在文章不计数、后台列表可见字段。

## 步骤

1. backend agent 先统一 API 字段和运行时模型：
   - 在文章类型中增加 `viewCount: number`。
   - `toSummary`/`toDetail` 明确输出该字段，缺省时归一为 `0`。
   - in-memory 种子文章设置 `viewCount: 0`，`saveDraft` 新文章默认 `0`，更新/发布/下架保留已有值。

2. backend agent 增加计数写路径：
   - 在 repository 契约增加 `incrementViewCountBySlug(slug)`，实现只更新已发布文章。
   - 在 service 层新增 `recordPublishedArticleView(slug)`，找不到公开文章时返回 404。
   - 在公开 controller 新增 `POST /api/articles/:slug/view`，返回最小数据，例如 `{ viewCount: number }`。
   - 明确不修改 `GET /api/articles/:slug` 的读取语义，避免 metadata、构建和服务端读取误计数。

3. database agent 新增迁移记录：
   - 新增迁移文件而不是改写 `0001_initial.sql`。
   - 字段建议为 `view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0)`。
   - 在迁移说明或文件注释中记录旧数据默认 `0`、SQLite 回滚限制、是否保留已产生统计数据的判断。
   - 说明当前运行时仍是 in-memory repository，迁移为持久化模型准备；本轮不引入数据库 adapter。

4. backend agent 同步共享契约和 SDK：
   - `packages/types` 的 `articleSummarySchema` 增加 `viewCount`，必要时新增 `articleViewResponseSchema`。
   - `packages/sdk` 保持 `listPublishedArticles`、`getArticle`、`listAdminArticles` 能解析新字段，新增 `recordArticleView` 时复用 schema。
   - 确保旧数据缺字段时由 API/Web normalize 提供默认值，schema 不吞掉真实接口错误。

5. frontend/admin agent 完成 C 端展示和计数：
   - 在 `apps/web/lib/api.ts` 的 Article 类型、fallback articles、normalize 中补齐 `viewCount`，缺失或非法值归一为非负整数。
   - 文章详情元信息区展示阅读量，文案可为 `X 次阅读`，与“分钟阅读”并列但不挤压标题、摘要和标签。
   - 新增 client component，在文章详情页面真实 API 数据成功渲染后 `useEffect` 调用计数接口；fallback、404、metadata、静态参数生成不触发。
   - 计数成功后更新页面上的阅读量；失败时保留初始值并不影响正文。

6. frontend/admin agent 完成后台展示：
   - 在 `apps/admin/src/main.tsx` 的文章类型中增加 `viewCount`。
   - 优先在文章列表表格增加阅读量列；如选择 Dashboard，则展示总阅读量或最热视频文章指标。
   - 不把 `viewCount` 加入 `ArticleFormState` 或保存 payload，避免后台误编辑。

7. tester agent 执行验收和回归：
   - 先跑 API e2e，确认新增计数语义。
   - 再跑类型检查/构建，确认 API/types/SDK/Web/Admin 字段链路一致。
   - 手工或自动验证文章详情桌面/移动端布局、fallback 状态、计数接口失败降级。

## 风险

- C 端计数依赖浏览器端 effect，禁用 JS 或接口被拦截时不会计数；本轮接受该限制，以避免服务端读取误计数。
- 当前 in-memory repository 无法跨进程重启持久保存阅读量；本轮同时交付迁移记录，但不改变运行时存储 adapter。
- 如果 `POST /api/articles/:slug/view` 返回完整 article，可能增加无谓 payload；优先返回最小 `{ viewCount }`，降低前端更新成本。
- Admin 单文件较大，改动时要控制范围，只增加类型、展示列/指标和缺省格式化，不重构路由或表单。

## 测试计划

- API e2e：
  - `GET /api/articles`、`GET /api/articles/:slug` 返回 `viewCount`，默认是非负整数。
  - 连续调用 `GET /api/articles/hello-world` 不改变 `viewCount`。
  - 调用 `POST /api/articles/hello-world/view` 后 `viewCount` 增加 1，连续调用连续增加。
  - `POST` 不存在 slug、草稿 slug 返回 404，且不改变任何公开文章计数。
  - `GET /api/admin/articles` 在带 token 时返回 `viewCount`，未授权仍返回 401。
- DB/迁移验证：
  - 新迁移能在现有 schema 上执行，历史文章默认 `0`。
  - 字段非负约束或等价保护生效。
  - 回滚说明清楚，不默认删除有价值统计数据。
- Web 验证：
  - `generateMetadata` 使用的读取路径不会计数。
  - 文章详情真实 API 数据渲染后触发一次计数并展示最新阅读量。
  - fallback 数据、接口失败、`0` 值、缺失字段不会出现 `undefined`、`NaN` 或布局错位。
  - 移动端和桌面端文章元信息区域不挤压标题、摘要、作者、时间、分类、标签和阅读时间。
- Admin 验证：
  - 登录后文章列表或 Dashboard 能看到阅读量。
  - 未登录不能访问后台文章数据。
  - 编辑/保存文章不会覆盖或重置 `viewCount`。
- 回归命令建议：
  - `npm --workspace @blog/api run test`
  - `npm run typecheck --workspaces --if-present`
  - `npm run build --workspaces --if-present`

## 完成检查

- [ ] 字段统一为 API/Web/Admin/SDK 使用 `viewCount`，数据库列使用 `view_count` 并完成映射说明。
- [ ] `GET /api/articles/:slug`、Next.js `generateMetadata`、`generateStaticParams` 和列表读取不会触发计数。
- [ ] `POST /api/articles/:slug/view` 只对已发布公开文章计数，失败不影响文章正文阅读。
- [ ] C 端详情页展示阅读量，`0`、缺失字段、fallback 和计数失败状态展示稳定。
- [ ] 后台文章列表或 Dashboard 至少一处展示阅读量，且不允许人工编辑该字段。
- [ ] in-memory 运行时和数据库迁移记录均已处理，并说明当前运行时不持久化到数据库的限制。
- [ ] API e2e、类型检查、构建或等价验证通过；无法执行的检查已有明确说明。
- [ ] 需求验收标准通过。
- [ ] 评审通过。
- [ ] 发布摘要已更新。
