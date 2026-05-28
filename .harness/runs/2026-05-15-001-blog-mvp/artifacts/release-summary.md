# 发布摘要

## 变更内容

- 前台 web 计划落地为 Next.js App Router，承载公开博客、文章详情、SEO/GEO。
- 后台 admin 计划落地为 React + Vite，承载登录、文章草稿和发布。
- 后端 API 计划落地为 NestJS REST 服务。
- 共享 SDK 和类型契约已更新。
- 新增 SQLite 初始 SQL migration 骨架。
- 新增 root workspace 脚本和 CI 检查计划。

## 用户影响

- 读者可访问公开博客首页和文章详情。
- 管理员可通过独立后台进行登录、保存草稿和发布。
- 本轮仍是 MVP 骨架，生产级认证、真实数据库持久化和部署参数后续继续加强。

## 部署步骤

1. 安装依赖：`npm ci`
2. 启动 API：`npm run dev:api`
3. 启动前台：`npm run dev:web`
4. 启动后台：`npm run dev:admin`
5. 生产构建：`npm run build`

## 验证步骤

1. `npm run harness:check`
2. `npm run test`
3. `npm run typecheck`
4. `npm run build`
5. 手动访问前台首页、文章详情和后台登录/发布流程。

## 回滚方式

1. 通过 Git revert 回滚本 run 的业务代码、配置和文档变更。
2. 如已执行数据库迁移，运行 `infra/database/migrations/0001_initial.down.sql`。
3. 恢复旧版启动脚本和 CI 配置。

## 关联 run

- `2026-05-15-001-blog-mvp`
