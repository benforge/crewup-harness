# 2026 第 21 周计划

## 本周运行记录

<!-- harness:run-sync:start 2026-05-18-002-complete-blog-system -->
### 2026-05-18 002 完善博客系统 MVP

- run: `2026-05-18-002-complete-blog-system`
- 详情: [2026-05-18-002-complete-blog-system](runs/2026-05-18-002-complete-blog-system.md)

#### 已完成
- C 端 Web 补全专业简约博客体验：首页重点文章、继续阅读、文章列表、文章详情、分类页、标签页、关于页、404、导航、页脚、sitemap、SEO/GEO metadata 和 JSON-LD。
- Admin 补全后台管理路由闭环：登录页、受保护路由、登录后回跳、会话恢复、退出、仪表盘、文章列表、文章编辑页、分类页、标签页和操作反馈。
- API 补全 MVP+ REST 契约：公开分类/标签接口、按分类/标签查询文章、管理端当前用户、文章更新/下架、分类/标签管理。
- 数据库 migration 补齐 MVP+ 字段：作者、分类描述、SEO/GEO 字段、canonical、AI/content summary、slug 唯一约束和查询索引。
- 测试扩展到 14 个 API e2e 用例，覆盖公开过滤、分类标签、认证保护、文章更新/发布/下架和分类标签创建。

#### 用户影响
- 读者可以通过更完整的 C 端路径浏览内容：最新文章、文章列表、分类、标签、文章详情和关于页。
- 管理员登录后进入受保护后台，可以通过独立模块路由维护文章、分类、标签、SEO/GEO 字段和发布状态。
- 未发布文章不会出现在公开 API 和 C 端页面。
- 本轮不包含评论、搜索、RSS、订阅、多作者、媒体库、富文本和生产部署自动化。

#### 验证
- 暂无验证记录，建议运行 harness:verify。

#### 阻塞和下一步
- 暂无明确阻塞项或下一步。
<!-- harness:run-sync:end 2026-05-18-002-complete-blog-system -->

<!-- harness:run-sync:start 2026-05-19-004-c-end-visual-polish -->
### 2026-05-19 004 C 端视觉与内容层级专项优化

- run: `2026-05-19-004-c-end-visual-polish`
- 详情: [2026-05-19-004-c-end-visual-polish](runs/2026-05-19-004-c-end-visual-polish.md)

#### 已完成
- 本 run 围绕 C 端 Web 的视觉专业化与内容层级整理收尾，目标是减少布局混乱、区块线条杂乱、卡片和边框噪音，提升首页、文章列表、文章详情、分类/标签、404/空态的阅读体验与扫描效率。
- 已按规划沉淀需求、架构、实施计划、测试报告和复核报告，明确本轮方向为“专业内容站 / 阅读体验”，而不是营销型首页、品牌重做或复杂动效。
- 实现侧复核记录显示，完成范围主要集中在 `articles`、`categories`、`tags` 三类列表/聚合页及共享 archive/list 样式，方向符合“减少卡片感、降低线条和边框噪音、提升列表扫描效率”的目标。
- 本 run 未记录越界修改 Admin、API、DB、infra 或 `docs/product`。

#### 用户影响
- C 端读者将获得更清晰的列表扫描体验、更弱的视觉噪音和更稳定的内容层级。
- 首页、列表、详情、分类页和 404 的关键视口已生成截图产物，可用于人工确认最终视觉满意度。
- 本轮不引入新权限、登录态、API schema、数据库结构或生产基础设施变化，对后台与服务端能力无直接用户影响。

#### 验证
- 暂无验证记录，建议运行 harness:verify。

#### 阻塞和下一步
- 暂无明确阻塞项或下一步。
<!-- harness:run-sync:end 2026-05-19-004-c-end-visual-polish -->

<!-- harness:run-sync:start 2026-05-20-005-it-engineer-blog-experience-redesign -->
### 2026-05-20 005 IT 工程师博主博客体验专业化重设计

- run: `2026-05-20-005-it-engineer-blog-experience-redesign`
- 详情: [2026-05-20-005-it-engineer-blog-experience-redesign](runs/2026-05-20-005-it-engineer-blog-experience-redesign.md)

#### 已完成
- C 端从通用博客体验收敛为“IT 工程师博客”阅读体验，覆盖首页、文章列表、文章详情、分类归档、标签归档、关于页、404、空状态、错误/fallback 提示。
- C 端文章列表已支持基于 URL 参数的搜索与分页展示，包括搜索无结果空状态、当前页/总页数、上一页/下一页导航。
- C 端 API fallback 不再静默掩盖真实失败，使用备用内容时会展示明确的降级提示。
- Admin 侧完成 CMS 工作台体验强化，覆盖登录/鉴权、Dashboard、文章列表、新建/编辑文章、分类管理、标签管理、反馈状态与危险操作确认。
- Admin 登录页已移除默认预填账号密码，输入框初始为空，避免暴露示例凭据。
- 截图验收已覆盖 C 端桌面/移动关键页面与 Admin 登录、认证后工作台、文章、分类、标签等关键页面。

#### 用户影响
- 读者能更快判断站点定位、技术内容方向和文章可信度，列表、归档、搜索、分页与空状态更清晰。
- 博主/管理员在 Admin 中能更稳定地完成内容生产、组织与发布管理，登录与操作反馈更可靠。
- 真实 API 不可用或降级时，前台会更清楚地提示当前状态，不再让用户误以为备用内容就是实时数据。
- 登录页不再出现默认凭据，降低误用和敏感信息暴露风险。

#### 验证
- 暂无验证记录，建议运行 harness:verify。

#### 阻塞和下一步
- 暂无明确阻塞项或下一步。
<!-- harness:run-sync:end 2026-05-20-005-it-engineer-blog-experience-redesign -->

<!-- harness:run-sync:start 2026-05-22-008-现在迭代一个功能-增加阅读量这个统计 -->
### 2026-05-22 现在迭代一个功能，增加阅读量这个统计

- run: `2026-05-22-008-现在迭代一个功能-增加阅读量这个统计`
- 详情: [2026-05-22-008-现在迭代一个功能-增加阅读量这个统计](runs/2026-05-22-008-现在迭代一个功能-增加阅读量这个统计.md)

#### 已完成
- 为已发布的公开文章补充阅读量统计能力，文章详情页在内容成功渲染后会触发一次计数，且不影响标题、摘要、正文和元信息展示。
- 后端新增公开阅读记录接口 `POST /api/articles/:slug/view`，并保持 `GET /api/articles/:slug` 为纯读取。
- `Article` / `ArticleSummary` / `ArticleDetail` 统一增加 `viewCount` 字段，API 响应和 SDK 解析结果同步更新。
- 数据库为 `articles` 表新增 `view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0)`，历史文章自动获得默认值 0。
- 后台文章列表或 Dashboard 至少一处展示阅读量，便于管理者查看内容表现。

#### 用户影响
- 访客阅读已发布文章时，页面会展示并累积阅读量，但不会改变原有浏览体验。
- 草稿和未发布文章不计入公开阅读量，避免污染统计口径。
- 管理端可以直接查看每篇文章的阅读表现，便于内容运营和复盘。

#### 验证
- `npm run typecheck` 通过，覆盖 `@blog/admin`、`@blog/api`、`@project/web`
- `npm run build` 通过，覆盖 `@blog/admin`、`@blog/api`、`@project/web`
- `npm run test --workspaces --if-present` 通过，`@blog/api` e2e 共 18/18 通过
- 阅读量 API 验证通过：
- `GET /api/articles/hello-world` 连续两次返回 `viewCount = 0`

#### 阻塞和下一步
- 暂无明确阻塞项或下一步。
<!-- harness:run-sync:end 2026-05-22-008-现在迭代一个功能-增加阅读量这个统计 -->
