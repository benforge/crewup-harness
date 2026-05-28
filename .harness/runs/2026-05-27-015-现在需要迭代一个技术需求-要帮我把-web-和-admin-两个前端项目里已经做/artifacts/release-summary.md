# 发布摘要

## 变更内容

- 本次发布范围已从原始 `web + admin` 需求收敛为仅处理 `apps/web` Tailwind-first 样式迁移。
- `apps/admin`、API、数据库、infra、权限、路由语义、数据获取方式、SEO 元信息逻辑和生产配置均无变更。
- 关键变更为 `apps/web` 已有公开页面和相关展示组件的页面/组件 class 迁移：布局、间距、宽度、对齐、响应式、交互状态、加载态、错误态和空态尽量改为 Tailwind utility class 表达。
- `apps/web/app/globals.css` 已收敛为 Tailwind 入口、theme token、base、暗色主题变量、Markdown/第三方渲染覆盖、必要动画和少量跨页规则，不再继续沉淀单页面布局、卡片、列表、按钮等页级样式。
- 本次变更文件集中在 `apps/web`，当前可见业务 diff 包括：
  - `apps/web/app/globals.css`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/not-found.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/app/photos/[id]/page.tsx`
  - `apps/web/app/photos/error.tsx`
  - `apps/web/app/photos/loading.tsx`
  - `apps/web/app/photos/page.tsx`
  - `apps/web/components/article/ArticleList.tsx`
  - `apps/web/components/photos/PhotoFilters.tsx`
  - `apps/web/components/photos/PhotoMasonryGrid.tsx`
  - `apps/web/components/states/EmptyState.tsx`
  - `apps/web/components/states/ErrorState.tsx`

## 验证结果

- `npm --workspace apps/web run typecheck` 通过。
- `npm --workspace apps/web run build` 通过。
- 本地 `next start` HTTP smoke 通过，覆盖 `/`、`/articles`、`/articles/hello-world`、`/categories/engineering`、`/tags/mvp`、`/photos`、`/photos?tag=workspace`、`/photos/photo-1`、`/about` 和 404 路由。
- 桌面端和移动端真实浏览器视觉回归通过，覆盖核心公开页面；同时完成首页和照片列表的轻量暗色主题抽查。
- Review 结论为有条件通过，未发现阻塞问题；条件来自剩余视觉与真实数据覆盖风险。

## 风险与未覆盖项

- 未做像素级 visual diff，当前视觉回归以真实浏览器人工/截图检查为主。
- 未完整覆盖所有页面的深色主题视觉回归，仅做了轻量抽查。
- 未覆盖真实后端 API 在线数据场景下的内容差异，当前运行检查主要基于 fallback 路径。
- `photos/loading.tsx` 与 `photos/error.tsx` 已通过代码阅读和构建验证，但未在真实运行时手动触发对应 loading/error 状态。
- 未完全覆盖滚动惯性、真实网络图片加载质量和极端屏宽下的细节表现。

## 部署步骤

1. 按常规 `apps/web` 发布流程执行依赖安装、类型检查和生产构建。
2. 部署 `apps/web` 构建产物到现有 web 运行环境。
3. 发布后 smoke 检查首页、文章列表、文章详情、分类、标签、照片列表、照片详情、关于页和 404 路由。
4. 本次无数据库迁移、无 API 发布要求、无 admin 发布要求、无 infra 变更。

## 回滚方式

1. 如发布后出现视觉或布局回归，revert 本次 `apps/web` 相关变更即可恢复到迁移前样式实现。
2. 如仅个别页面或组件异常，可优先回退对应页面/组件的 Tailwind class 调整。
3. 如 `apps/web/app/globals.css` 收敛导致跨页影响，可回退该文件相关变更，并保留已验证无影响的页面级 Tailwind 迁移。
4. 本次不涉及数据库、API 契约、权限或生产配置变更，因此无数据回滚步骤。

## 发布结论

- 状态：可发布，带非阻塞风险。
- 阻塞项：无。
- 交接建议：发布前如风险偏好较保守，可补充像素级 diff、全量深色主题检查、真实 API 数据 smoke，以及 loading/error 真实触发验证。

## 输入说明

- 已读取 `requirement.md`、`architecture.md`、`implementation-plan.md`、`test-report.md`、`review-report.md`。
- 已读取 `logs/changed-files.json`，其中记录 13 个 `apps/web` 变更文件；文件范围与 `review-report.md`、`test-report.md` 和当前 `git diff --name-only -- apps/web` 结果交叉一致。
