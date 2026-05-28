# 2026 第 20 周计划

## 本周目标

- 完成 harness 起步模板。
- 准备第一个 ready 任务。
- 跑通从 ready 任务创建 run 的流程。

## 本周运行记录

<!-- harness:run-sync:start 2026-05-15-001-blog-mvp -->
### 2026-05-15 001 个人博客 MVP

- run: `2026-05-15-001-blog-mvp`
- 详情: [2026-05-15-001-blog-mvp](runs/2026-05-15-001-blog-mvp.md)

#### 已完成
- 前台 web 计划落地为 Next.js App Router，承载公开博客、文章详情、SEO/GEO。
- 后台 admin 计划落地为 React + Vite，承载登录、文章草稿和发布。
- 后端 API 计划落地为 NestJS REST 服务。
- 共享 SDK 和类型契约已更新。
- 新增 SQLite 初始 SQL migration 骨架。
- 新增 root workspace 脚本和 CI 检查计划。

#### 用户影响
- 读者可访问公开博客首页和文章详情。
- 管理员可通过独立后台进行登录、保存草稿和发布。
- 本轮仍是 MVP 骨架，生产级认证、真实数据库持久化和部署参数后续继续加强。

#### 验证
- 暂无验证记录，建议运行 harness:verify。

#### 阻塞和下一步
- 暂无明确阻塞项或下一步。
<!-- harness:run-sync:end 2026-05-15-001-blog-mvp -->
