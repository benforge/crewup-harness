# 架构和影响范围

## 当前阶段

- stage: plan
- 执行方式: 主 agent 单独完成第一轮规划，不启动子 agent。
- 本轮边界: 根据用户新要求调整技术架构方案，不修改业务代码。

## 影响范围

- [x] web: 读者侧首页、文章详情、SEO/GEO 基础能力。
- [x] admin: React + Vite 后台，管理员登录、文章草稿和发布。
- [x] api: NestJS REST API、统一错误处理、鉴权、数据访问。
- [x] db: 用户、文章、分类、标签和关联表模型。
- [x] infra: Next.js/NestJS 构建、CI、数据库迁移入口和部署说明。
- [x] docs: harness run 产物、需求和架构记录。

## 技术选型

| 层级 | 选择 | 原因 |
| --- | --- | --- |
| Monorepo | npm workspace / pnpm workspace 兼容目录 | 当前仓库已有 `apps/*` 与 `packages/*`，下一轮实现前再统一包管理器。 |
| 前台 web | Next.js App Router | 读者侧天然需要 SEO；App Router 支持布局、路由、服务端渲染、静态生成和 Metadata API。 |
| 前台 SEO | Next.js Metadata API、`generateMetadata`、`sitemap.ts`、`robots.ts`、JSON-LD | Context7 已确认 App Router 推荐通过 metadata 导出和动态 metadata 管理页面标题、描述等 SEO 信息。 |
| 前台 GEO | 面向 AI/生成式搜索的内容结构化 | 通过清晰语义 HTML、稳定 canonical URL、JSON-LD、作者/发布时间/标签、摘要、站点地图和可抓取详情页支持后期 GEO。 |
| 后台 admin | React + Vite 独立应用 | 用户指定；后台不需要 SEO，React 适合表单、状态和管理交互，Vite 提供轻量 dev/build/preview 闭环。 |
| API | NestJS | 用户指定；NestJS 通过 modules/controllers/providers 组织服务，适合后续扩展认证、后台、数据库和 OpenAPI。 |
| API 校验 | NestJS DTO + 全局 `ValidationPipe`，必要时保留 Zod 作为共享契约 | Context7 已确认 NestJS 可在 bootstrap 中启用全局 validation pipe、CORS 和 route prefix。 |
| API 错误 | NestJS Exception Filter | 统一输出 `{ error: { code, message, details? } }`。 |
| 数据库 | SQLite + Drizzle ORM + drizzle-kit | 继续作为 MVP 持久化候选，轻量、迁移清晰；后续可按部署需要换 PostgreSQL。 |
| 测试 | NestJS testing utilities + Next.js/Vite 构建检查 | NestJS 文档支持 `Test.createTestingModule()`；Next.js 验证 SEO 路由构建，Vite 验证后台构建。 |
| CI | GitHub Actions | 下一轮扩展到安装依赖、API test、web build、admin build 至少两类检查。 |

## 方案

采用面向长期内容增长的 monorepo 架构：`apps/web` 改造为 Next.js App Router 应用，只承载公开博客页、文章详情和 SEO/GEO 能力；`apps/admin` 改造为 React + Vite 独立后台，只承载管理端登录、文章编辑、草稿和发布；`apps/api` 改造为 NestJS REST 服务，提供文章、认证和管理接口；共享类型和 SDK 继续放在 `packages/*`，数据库 schema 和迁移放在 `infra/database` 或 API 内部 db 模块。

前台优先保证可抓取、可索引、可被 AI 引擎理解：文章列表和详情页使用服务端数据获取或静态生成；文章详情提供动态 metadata、canonical、Open Graph、JSON-LD、发布时间、更新时间、作者、标签和摘要；站点提供 sitemap 和 robots。后台管理不追求 SEO，使用 React 客户端应用处理表单、状态和 API 调用。

## 目标项目结构

```text
apps/
  web/
    app/
      layout.tsx
      page.tsx
      sitemap.ts
      robots.ts
      articles/
        [slug]/
          page.tsx
    src/
      components/
      lib/
        api.ts
        seo.ts
    package.json
    next.config.ts
  admin/
    index.html
    src/
      main.tsx
      App.tsx
      components/
      lib/
        api.ts
      routes/
    package.json
    vite.config.ts
  api/
    src/
      main.ts
      app.module.ts
      common/
        filters/
        guards/
      articles/
        articles.module.ts
        articles.controller.ts
        articles.service.ts
        dto/
      auth/
        auth.module.ts
        auth.controller.ts
        auth.service.ts
        dto/
      db/
        db.module.ts
        schema.ts
    test/
    package.json
packages/
  types/
    src/index.ts
  sdk/
    src/index.ts
infra/
  database/
    migrations/
    drizzle.config.ts
docs/
  product/
.github/
  workflows/
    ci.yml
```

## 模块职责

- `apps/web`: Next.js App Router 读者侧页面、SEO/GEO metadata、sitemap、robots、JSON-LD。
- `apps/admin`: React + Vite 管理后台，处理登录状态、文章表单、草稿保存和发布。
- `apps/api`: NestJS 服务，承载公开文章 API、管理员 API、统一错误处理、鉴权、数据库访问。
- `packages/types`: 共享领域类型和请求响应契约；如使用 DTO 为主，则保留 API response 类型。
- `packages/sdk`: Web 侧 API client，封装 NestJS REST 调用、错误处理和数据转换。
- `infra/database`: Drizzle schema、迁移文件、空库初始化和回滚说明。
- `.github/workflows`: CI 检查入口，覆盖 API test 和 Web build。

## 最小可运行骨架

- 本地启动 web: `npm --workspace apps/web run dev`，默认 Next.js 端口 `3000`。
- 本地启动 admin: `npm --workspace apps/admin run dev`，默认 Vite 端口 `5173`，通过 API base URL 调用 NestJS。
- 本地启动 API: `npm --workspace apps/api run start:dev`，默认 NestJS 端口 `3001`，全局前缀建议 `/api`。
- 前台首页: `GET /` 展示已发布文章列表。
- 文章详情: `GET /articles/[slug]` 展示文章内容，并生成动态 SEO metadata 和 JSON-LD。
- 后台入口: Vite SPA 首页提供登录和文章管理 MVP。
- 数据持久化: NestJS service 经 repository/db provider 访问 SQLite；开发态 seed 初始化管理员和文章。
- 最小数据: 1 个管理员、1 篇 published 文章、1 篇 draft 文章、基础分类和标签。

## API 设计概要

- `GET /api/health`: 健康检查。
- `GET /api/articles`: 已发布文章列表。
- `GET /api/articles/:slug`: 已发布文章详情。
- `POST /api/admin/login`: 管理员登录。
- `GET /api/admin/articles`: 后台文章列表。
- `POST /api/admin/articles`: 创建或更新文章草稿。
- `POST /api/admin/articles/:id/publish`: 发布文章。

## 数据模型概要

- `users`: 管理员用户。
- `articles`: 文章主表，包含 slug、title、summary、body、status、publishedAt、seoTitle、seoDescription。
- `categories`: 分类。
- `tags`: 标签。
- `article_tags`: 文章与标签多对多关联。

## 风险

- 从原生前端调整为 Next.js、从 Hono 调整为 NestJS，会扩大首轮依赖、脚本、构建和 CI 改动范围。
- Next.js 和 NestJS 都更适合 TypeScript，当前仓库是 JavaScript 起步，下一轮建议同步迁移相关 app/package 到 TypeScript。
- `apps/web` 与 `apps/admin` 分离后，认证态、API base URL、CORS 和部署路径需要显式配置。
- GEO 的具体含义需要确认；当前方案按 Generative Engine Optimization 处理，不按地理定位处理。
- SQLite 适合 MVP，但部署环境若要求多实例写入，需要重新评估数据库。
