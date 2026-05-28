# 架构和影响范围

## 影响范围

- [x] web：公开文章详情页展示阅读量，并在页面成功渲染后由浏览器端触发一次计数；`generateMetadata`、`generateStaticParams`、列表页和分类/标签页读取文章时不得触发计数。
- [x] admin：后台文章列表或 Dashboard 至少一处展示阅读量；继续复用现有登录态和受保护接口，不新增独立“阅读量管理”入口。
- [x] api：文章模型、summary/detail 输出、公开计数接口、后台文章列表输出、repository 契约需要同步增加 `viewCount`。
- [x] db：新增文章维度持久化字段评估与迁移记录；同时承认当前运行时仍是 in-memory repository，迁移不会自动影响运行时行为。
- [ ] infra：本轮不新增队列、缓存、限流、第三方统计服务或基础设施。
- [x] docs：在本 run artifacts 和后续交付摘要中记录字段语义、触发口径、迁移/回滚边界。

## 方案

本轮统一字段命名为 `viewCount`，语义为“文章维度累计公开阅读次数”，类型为非负整数，缺省值为 `0`。该字段进入 API 运行时 `Article`、`ArticleSummary`、`ArticleDetail`、`packages/types` Zod schema、SDK 响应解析、Web 本地类型和 Admin 本地类型，避免出现 `readCount`、`views`、`view_count` 等多个前端/接口命名。数据库列建议使用 snake_case `view_count`，由 repository/adapter 映射为 API 字段 `viewCount`。

计数触发采用显式写接口，不在现有 `GET /api/articles/:slug` 中自增。建议新增公开接口 `POST /api/articles/:slug/view`，只对已发布文章执行 `+1`，返回 `{ viewCount }` 或等价的最小响应；不存在、草稿、未发布文章返回与公开详情一致的 404，不产生计数。现有 `GET /api/articles/:slug` 继续只读，用于文章详情、Next.js `generateMetadata`、构建期静态参数和其他读取场景，从架构上避免 SEO metadata、构建、预取或服务端读取造成误计数。

C 端文章详情页在服务端成功拿到公开文章并完成页面渲染后，挂载一个很小的 client component，例如 `ArticleViewTracker`。该组件只在 `articleResult.state === "api"` 且存在真实文章时通过 `useEffect` 调用 `POST /api/articles/:slug/view`；fallback 内容、不存在文章、`notFound()`、metadata 读取和列表读取不触发。详情页展示初始 `article.viewCount`，计数接口成功后可用返回的最新数值更新局部展示；接口失败只记录可诊断信息或静默降级，不影响正文阅读。

后端在 `ArticleRepository` 增加原子语义方法，例如 `incrementViewCountBySlug(slug: string): Article | null` 或 `incrementViewCountById(id: string): Article | null`。当前 in-memory 实现需要在种子文章、创建草稿、更新、发布/下架流转中保留 `viewCount`，并在 increment 方法里复制更新 Map 中的文章对象。若未来切到数据库 repository，该方法应落到单条 SQL 原子更新：`view_count = view_count + 1`，避免并发覆盖。

数据库本轮建议由 database agent 新增迁移文件，而不是直接改历史初始迁移：`ALTER TABLE articles ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0);`。SQLite 对带约束列和回滚有版本差异，迁移文件需要按现有迁移规范确认可执行写法；回滚策略优先关闭展示和计数触发，只有确认不保留统计数据时才执行列级回滚。由于当前 API 运行时使用 `InMemoryArticleRepository`，迁移记录是持久化模型准备，不会让当前开发服务自动持久保存阅读量；运行时交付由 in-memory 字段和 increment 方法保证。

后台展示建议优先放在现有文章列表表格中增加 `Views`/`阅读量` 列，Dashboard 可选增加总阅读量或 Top article 指标。不要把 `viewCount` 放入文章编辑表单的可写字段，不提供人工编辑、重置或校准入口。Admin 只消费受保护的 `/api/admin/articles` 返回字段，未登录访问仍由现有 guard 阻断。

实现 agent 拆分建议：

- `backend`：负责 API/types/repository/service/controller 运行时改造，新增公开计数接口和 API e2e 覆盖。
- `database`：负责新增迁移文件、默认值、兼容旧数据和回滚说明。
- `frontend/admin`：负责 C 端详情展示与计数组件、Web fallback/normalize 缺省、Admin 列表或 Dashboard 展示。
- `tester`：负责串联验收 AC，重点验证 GET 不计数、POST 计数、metadata/build 路径不计数、UI 缺省值稳定。

## 风险

- 误计数风险：如果直接在 `GET /api/articles/:slug` 中自增，Next.js `generateMetadata`、`generateStaticParams`、服务端预渲染、链接预取或测试读取都可能产生阅读量。必须以独立 `POST` 写接口和浏览器端渲染后触发规避。
- 运行时与迁移脱节：当前生产样式运行时仍是 in-memory repository，进程重启会丢失阅读量；迁移文件只是为数据库持久化模型留痕。本轮交付需明确“当前运行时可验证、但不保证重启后持久”的现实，除非另有数据库 adapter 接入任务。
- 并发一致性风险：in-memory 自增在单进程内可接受，但多实例或数据库实现需要原子更新。repository 契约应表达 increment 语义，不让 service 先读后写拼接。
- 字段漂移风险：API、`packages/types`、SDK、Web、Admin 同时存在文章类型，若只改一处容易出现解析失败或 `undefined`/`NaN` 展示。实施时必须沿完整链路同步。
- 降级体验风险：计数接口失败不应阻塞文章正文；前端展示要对 `0`、缺失字段、fallback 数据和接口失败都有明确缺省。
