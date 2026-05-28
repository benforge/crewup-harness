# 发布摘要

## 变更内容

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

## 部署步骤

1. 安装依赖：`npm install`。
2. 运行验证：`npm run typecheck`、`npm run test`、`npm run build`。
3. 本地启动 API：`npm run dev:api`。
4. 本地启动 Web：`npm run dev:web`。
5. 本地启动 Admin：`npm run dev:admin`。
6. 如需真实数据库持久化，先由用户确认迁移目标和回滚方案；本轮未执行数据库迁移。

## 验证步骤

1. `npm run harness:check`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npm run harness:verify -- 2026-05-18-002-complete-blog-system`
6. Playwright CLI + Edge channel 截图验证：`admin-protected-route.png`、`web-home-desktop.png`、`web-home-mobile.png`

## 回滚方式

1. 代码回滚：使用 Git revert 回退本轮业务代码变更。
2. 数据库回滚：本轮未执行迁移；如后续执行 `0001_initial.sql`，仅在明确允许重建的本地库中使用 `0001_initial.down.sql` 回滚。
3. 产品文档回滚：本轮未同步 `docs/product/`，无需产品文档回滚。
4. 若只回滚 harness 记录，回退 `.harness/runs/2026-05-18-002-complete-blog-system/` 相关变更即可。

## 关联 run

- `2026-05-18-002-complete-blog-system`
