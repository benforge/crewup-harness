# 发布摘要

## 变更内容

- 为已发布的公开文章补充阅读量统计能力，文章详情页在内容成功渲染后会触发一次计数，且不影响标题、摘要、正文和元信息展示。
- 后端新增公开阅读记录接口 `POST /api/articles/:slug/view`，并保持 `GET /api/articles/:slug` 为纯读取。
- `Article` / `ArticleSummary` / `ArticleDetail` 统一增加 `viewCount` 字段，API 响应和 SDK 解析结果同步更新。
- 数据库为 `articles` 表新增 `view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0)`，历史文章自动获得默认值 0。
- 后台文章列表或 Dashboard 至少一处展示阅读量，便于管理者查看内容表现。

## 用户影响

- 访客阅读已发布文章时，页面会展示并累积阅读量，但不会改变原有浏览体验。
- 草稿和未发布文章不计入公开阅读量，避免污染统计口径。
- 管理端可以直接查看每篇文章的阅读表现，便于内容运营和复盘。

## 部署步骤

1. 先在预发布环境执行数据库迁移，添加 `articles.view_count` 字段并确认默认值生效。
2. 发布后端服务与类型包，确保 `POST /api/articles/:slug/view`、文章详情响应和 SDK 解析已同步。
3. 发布前端 web 与 admin，确认文章详情页触发计数、管理端能看到阅读量。
4. 做一次冒烟验证：访问已发布文章详情页并检查阅读量递增，再刷新确认读数稳定。

## 验证步骤

1. 执行 `npm run typecheck`，确认 `@blog/admin`、`@blog/api`、`@project/web` 相关类型无误。
2. 执行 `npm run build`，确认 web 和 admin 构建通过。
3. 执行 `npm run test --workspaces --if-present`，确认工作区测试通过。
4. 手工验证 `GET /api/articles/:slug` 不触发计数，`POST /api/articles/:slug/view` 会累加阅读量，草稿和缺失文章返回 404 且不污染公开统计。
5. 在浏览器中确认公开文章详情页渲染后会触发一次计数，且页面内容不受影响。

## 回滚方式

1. 回滚应用代码到上一稳定版本，撤销 `POST /api/articles/:slug/view` 相关变更与 `viewCount` 展示逻辑。
2. 执行数据库回滚，移除 `articles.view_count` 字段，或在兼容策略下保留字段但停止写入。
3. 验证回滚后 `GET /api/articles/:slug` 恢复原始响应结构，文章详情页不再发起阅读量请求。

## 关联 run

- 2026-05-22-008-现在迭代一个功能-增加阅读量这个统计
