# 实施计划

## 任务摘要

根据用户调整，将个人博客 MVP 技术架构改为 Next.js App Router 前台、React + Vite 后台、NestJS 后端服务，并保留 SEO/GEO、数据库迁移、CI 和最小可运行骨架要求。本轮只更新方案文档；下一轮进入代码实现前，先向用户确认具体代码改动计划。

## 本轮已定范围

- 前台 web 从原生 HTML/CSS/ESM 调整为 Next.js App Router。
- 后台 admin 从原生 HTML/CSS/ESM 调整为 React + Vite 独立应用。
- 后端服务从 Hono 调整为 NestJS。
- SEO/GEO 进入首版架构考虑范围。
- 数据层仍以 SQLite + Drizzle 作为 MVP 候选方案。
- 管理后台不放入 Next.js，仅 `apps/admin` 使用 React + Vite。

## 下一轮代码实施计划

## 步骤

1. 基线确认
   - 确认是否废弃当前 `apps/web` 原生页面并初始化 Next.js App Router。
   - 确认是否废弃当前 `apps/admin` 原生页面并初始化 React + Vite。
   - 确认是否将 `apps/api` 从 Hono 重建为 NestJS。

2. 工作区和依赖
   - 统一包管理器策略，建议 npm workspaces 或 pnpm 二选一。
   - 为 `apps/web` 增加 Next.js、React、TypeScript 相关配置。
   - 为 `apps/admin` 增加 Vite、React、TypeScript 相关配置。
   - 为 `apps/api` 增加 NestJS、TypeScript、测试和启动脚本。

3. Next.js 前台
   - 建立 `app/layout.tsx`、`app/page.tsx`、`app/articles/[slug]/page.tsx`。
   - 首页服务端获取 published 文章列表。
   - 文章详情页按 slug 获取文章，生成 `generateMetadata`。
   - 增加 `app/sitemap.ts`、`app/robots.ts`、canonical、Open Graph、JSON-LD。
   - 为 GEO 保留结构化内容字段：摘要、作者、发布时间、更新时间、标签、分类。

4. React + Vite 后台
   - 建立 `apps/admin/src/main.tsx`、`App.tsx` 和基础路由/视图。
   - 登录成功后保存开发态 token。
   - 文章表单支持保存草稿和发布。
   - 通过环境变量配置 NestJS API base URL。
   - 后台作为独立管理应用，不参与 SEO 索引。

5. NestJS API
   - 建立 `main.ts`、`app.module.ts`，启用 CORS、全局 `/api` prefix、全局 validation pipe。
   - 建立 `ArticlesModule`、`AuthModule`、`DbModule`。
   - 用 controller/service/provider 分层实现文章列表、详情、登录、草稿保存、发布。
   - 增加 exception filter，统一错误响应结构。
   - 增加 guard 或 middleware 处理 Bearer token。

6. 数据库层
   - 在 `infra/database` 或 `apps/api/src/db` 增加 Drizzle SQLite schema。
   - 生成初始迁移，覆盖 users、articles、categories、tags、article_tags。
   - 增加 seed 或开发态初始化脚本。

7. 共享契约和 SDK
   - `packages/types` 提供共享类型、API response 类型和可选 Zod schema。
   - `packages/sdk` 封装 web 调用 NestJS API 的 fetch client。
   - 若 NestJS DTO 与 Zod 并存，明确单一事实来源，避免契约漂移。

8. 测试和 CI
   - API 测试覆盖文章列表、详情、登录失败、登录成功、保存草稿、发布文章。
   - Web build 验证 Next.js App Router、metadata、sitemap、robots 可构建。
   - Admin build 验证 React + Vite 后台可构建。
   - CI 至少运行 API test、Web build、Admin build 中的两项；保留 `harness:check`。

## 文件和模块

- `.harness/runs/2026-05-15-001-blog-mvp/artifacts/*`
- `apps/web/**`
- `apps/admin/**`
- `apps/api/**`
- `packages/types/**`
- `packages/sdk/**`
- `infra/database/**`
- `.github/workflows/**`
- `package.json` 和 workspace package scripts

## 风险

- Next.js + React/Vite + NestJS 会比原生/Hono 方案更重，但分工更清楚：公开内容重 SEO，后台重交互，后端重模块化。
- 当前仓库已有 Hono 与原生页面骨架，下一轮实现会涉及替换而不是小修。
- TypeScript 迁移会扩大改动范围，但 Next.js/NestJS 生态下收益明显。
- 独立 admin 与 web 会带来跨应用 CORS、环境变量和部署路径配置。
- GEO 具体定义尚需确认；当前先按生成式搜索优化设计。
- 包管理器混用会影响依赖安装和 CI，下一轮应先统一。

## 测试计划

- `npm run harness:check`
- `npm run harness:verify -- 2026-05-15-001-blog-mvp`
- API 测试：文章列表、详情、登录失败、登录成功、保存草稿、发布文章。
- Web 构建：Next.js `build` 通过，App Router 路由可生成。
- Admin 构建：Vite `build` 通过。
- SEO/GEO 验证：文章详情有 metadata、canonical、JSON-LD；站点有 sitemap 和 robots。
- 数据库验证：空库执行迁移并可 seed 初始管理员和文章。

## 完成检查

- [x] 需求目标和非目标已整理。
- [x] 技术选型已按用户要求调整为 Next.js App Router + React/Vite Admin + NestJS。
- [x] SEO/GEO 已进入架构和实施计划。
- [x] 项目结构设计已更新。
- [x] 最小可运行骨架方案已更新。
- [x] 业务代码已按 Next.js + React/Vite + NestJS MVP 骨架修改。
- [x] 验收标准已通过 MVP 范围验证。
- [x] 测试、类型检查、构建和本地 smoke 已运行。
