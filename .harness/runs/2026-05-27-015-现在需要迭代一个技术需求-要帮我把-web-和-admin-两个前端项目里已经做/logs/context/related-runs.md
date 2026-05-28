# 相关历史 run：2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做

> 本文件由 `npm run harness:knowledge-select` 自动生成。Requirements 和 Architect 必须先阅读本摘要；需要细节时再打开对应历史 artifacts。

- generatedAt: 2026-05-27T10:31:09.858Z
- source: .harness/knowledge/run-index.json
- currentScopes: web, admin, db

## 使用规则

- 需求和架构阶段必须说明：复用了哪些历史决策、与哪些历史方案冲突、是否没有命中相关历史。
- 默认只深读下方最多 3 个历史 run；除非高风险或用户要求，不要展开所有历史 run。
- 如果本摘要为空，也要在 `requirement.md` 或 `architecture.md` 写明“未命中相关历史 run”。

## 命中结果

### 2026-05-19-003-ui-framework-polish

- title: 003 UI 框架化与交互体验优化
- status: ready-for-user-review/release
- updatedAt: 2026-05-19T09:20:00.000Z
- score: 56
- reasons: scope:web, scope:admin, term:web, term:admin, term:config, term:tailwind, term:ant, term:design
- modules: web, admin, docs

#### 历史能力 / 决策摘要

- Admin 侧接入 Ant Design v5，依赖解析为 antd@5.29.3，入口使用 antd/dist/reset.css、ConfigProvider、App 与主题 token。
- Admin 后台外壳、导航、表单、表格、确认弹窗、消息提示、加载态、空态和错误态已用 Ant Design 基础组件收敛。
- Admin 登录、受保护路由、未授权/会话失效回登录、退出确认等鉴权 UI 闭环已保留并补齐基础反馈。
- Web C 端接入 Tailwind CSS v4，依赖解析为 tailwindcss@4.3.0、@tailwindcss/postcss@4.3.0，新增 PostCSS 配置并在全局 CSS 引入 @import "tailwindcss";。
- Web 根布局保留现有页面结构，并增加最小 Tailwind 布局增强，包括 body 基础样式、站点 shell、sticky 顶部导航与轻量交互状态。
- Admin 使用 Ant Design v5 作为后台 UI 基础，收敛布局、导航、表单、表格、消息反馈、确认弹窗、加载态、空态和错误态。
- Web C 端使用 Tailwind CSS v4 作为样式组织基础，优先保证核心阅读路径的容器、间距、响应式和交互状态一致。
- 本轮保持现有 API、数据库和部署边界不变，只在前端工程与 run artifacts 内实施。

#### 建议深读 artifacts

- requirement: `.harness/runs/2026-05-19-003-ui-framework-polish/artifacts/requirement.md`
- architecture: `.harness/runs/2026-05-19-003-ui-framework-polish/artifacts/architecture.md`
- implementationPlan: `.harness/runs/2026-05-19-003-ui-framework-polish/artifacts/implementation-plan.md`
- releaseSummary: `.harness/runs/2026-05-19-003-ui-framework-polish/artifacts/release-summary.md`
- reviewReport: `.harness/runs/2026-05-19-003-ui-framework-polish/artifacts/review-report.md`

### 2026-05-22-008-现在迭代一个功能-增加阅读量这个统计

- title: 现在迭代一个功能，增加阅读量这个统计
- status: done/done
- updatedAt: 2026-05-22T10:58:24.822Z
- score: 54
- reasons: scope:web, scope:admin, scope:db, term:web, term:admin, term:现在, term:迭代, term:代一
- modules: web, admin, api, db, docs

#### 历史能力 / 决策摘要

- 为已发布的公开文章补充阅读量统计能力，文章详情页在内容成功渲染后会触发一次计数，且不影响标题、摘要、正文和元信息展示。
- 后端新增公开阅读记录接口 POST /api/articles/:slug/view，并保持 GET /api/articles/:slug 为纯读取。
- Article / ArticleSummary / ArticleDetail 统一增加 viewCount 字段，API 响应和 SDK 解析结果同步更新。
- backend：负责 API/types/repository/service/controller 运行时改造，新增公开计数接口和 API e2e 覆盖。
- database：负责新增迁移文件、默认值、兼容旧数据和回滚说明。
- frontend/admin：负责 C 端详情展示与计数组件、Web fallback/normalize 缺省、Admin 列表或 Dashboard 展示。
- 误计数风险：如果直接在 GET /api/articles/:slug 中自增，Next.js generateMetadata、generateStaticParams、服务端预渲染、链接预取或测试读取都可能产生阅读量。必须以独立 POS...
- 运行时与迁移脱节：当前生产样式运行时仍是 in-memory repository，进程重启会丢失阅读量；迁移文件只是为数据库持久化模型留痕。本轮交付需明确“当前运行时可验证、但不保证重启后持久”的现实，除非另有数据库 adapter 接入...

#### 建议深读 artifacts

- requirement: `.harness/runs/2026-05-22-008-现在迭代一个功能-增加阅读量这个统计/artifacts/requirement.md`
- architecture: `.harness/runs/2026-05-22-008-现在迭代一个功能-增加阅读量这个统计/artifacts/architecture.md`
- implementationPlan: `.harness/runs/2026-05-22-008-现在迭代一个功能-增加阅读量这个统计/artifacts/implementation-plan.md`
- releaseSummary: `.harness/runs/2026-05-22-008-现在迭代一个功能-增加阅读量这个统计/artifacts/release-summary.md`
- reviewReport: `.harness/runs/2026-05-22-008-现在迭代一个功能-增加阅读量这个统计/artifacts/review-report.md`

### 2026-05-15-001-blog-mvp

- title: 001 个人博客 MVP
- status: in-progress/verify
- updatedAt: 2026-05-18T06:58:00.000Z
- score: 51
- reasons: scope:web, scope:admin, scope:db, term:web, term:admin, term:需要, term:一个, term:前端
- modules: web, admin, api, db, infra, docs

#### 历史能力 / 决策摘要

- 前台 web 计划落地为 Next.js App Router，承载公开博客、文章详情、SEO/GEO。
- 后台 admin 计划落地为 React + Vite，承载登录、文章草稿和发布。
- 后端 API 计划落地为 NestJS REST 服务。
- 共享 SDK 和类型契约已更新。
- 新增 SQLite 初始 SQL migration 骨架。
- 第一个 MVP 阶段以分支和 PR 为回滚边界。
- 业务代码回滚通过 Git revert 完成。
- 数据库迁移必须提供 down migration 或清晰的手动回滚步骤。

#### 建议深读 artifacts

- requirement: `.harness/runs/2026-05-15-001-blog-mvp/artifacts/requirement.md`
- architecture: `.harness/runs/2026-05-15-001-blog-mvp/artifacts/architecture.md`
- implementationPlan: `.harness/runs/2026-05-15-001-blog-mvp/artifacts/implementation-plan.md`
- releaseSummary: `.harness/runs/2026-05-15-001-blog-mvp/artifacts/release-summary.md`
- reviewReport: `.harness/runs/2026-05-15-001-blog-mvp/artifacts/review-report.md`

