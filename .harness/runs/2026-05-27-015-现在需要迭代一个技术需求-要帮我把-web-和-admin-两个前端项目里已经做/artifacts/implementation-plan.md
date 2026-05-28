# 实施计划

## 任务摘要

将 `apps/web` 既有公开页面和相关组件迁移为 Tailwind CSS v4 优先样式写法，收敛 `apps/web/app/globals.css` 中可被 utility class 替代的页面级样式，同时保持业务逻辑、API、数据库、权限、路由语义和 SEO 逻辑不变。

## 文件和模块

- 页面与路由外壳：
  - `apps/web/app/layout.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/app/not-found.tsx`
  - `apps/web/app/about/page.tsx`
  - `apps/web/app/articles/page.tsx`
  - `apps/web/app/articles/[slug]/page.tsx`
  - `apps/web/app/photos/page.tsx`
  - `apps/web/app/photos/[id]/page.tsx`
  - `apps/web/app/photos/loading.tsx`
  - `apps/web/app/photos/error.tsx`
  - `apps/web/app/categories/[slug]/page.tsx`
  - `apps/web/app/tags/[slug]/page.tsx`
- 共享展示组件：
  - `apps/web/components/article/ArticleList.tsx`
  - `apps/web/components/article/MarkdownRenderer.tsx`
  - `apps/web/components/photos/PhotoMasonryGrid.tsx`
  - `apps/web/components/photos/PhotoFilters.tsx`
  - `apps/web/components/photos/PhotoImage.tsx`
  - `apps/web/components/states/EmptyState.tsx`
  - `apps/web/components/states/ErrorState.tsx`
  - `apps/web/components/theme/ThemeToggle.tsx`
- 样式边界：
  - `apps/web/app/globals.css`

不修改 `apps/admin/**`、`apps/api/**`、数据库迁移、权限逻辑、生产配置、`docs/product/**`。

## 步骤

1. 盘点现有 `globals.css` 中的语义 class，按职责分为三类：必须保留的 token/base/Markdown/动画规则、可迁移到页面 JSX 的布局规则、可迁移到组件 JSX 的展示规则。
2. 先迁移根布局和通用组件：`layout.tsx`、`ThemeToggle`、`EmptyState`、`ErrorState`，确保 header、nav、footer、skip link、主题按钮、空态和错误态具备稳定的 Tailwind class、focus-visible 和移动端布局。
3. 迁移文章链路：`page.tsx`、`articles/page.tsx`、`articles/[slug]/page.tsx`、`categories/[slug]/page.tsx`、`tags/[slug]/page.tsx`、`ArticleList.tsx`、`MarkdownRenderer.tsx`。保留搜索、分页、相关文章、上下篇、阅读量展示和 metadata 逻辑。
4. 迁移相册链路：`photos/page.tsx`、`photos/[id]/page.tsx`、`photos/loading.tsx`、`photos/error.tsx`、`PhotoMasonryGrid.tsx`、`PhotoFilters.tsx`、`PhotoImage.tsx`。保留筛选 URL 参数、照片比例、图片 fallback、加载骨架和重试行为。
5. 迁移关于页和 404：`about/page.tsx`、`not-found.tsx`，统一内容区宽度、列表、准则网格和操作链接的 Tailwind 表达。
6. 收敛 `globals.css`：保留 `@import "tailwindcss";`、`@theme`、`:root`、`.dark`、base 样式、Markdown/表格/代码块/照片加载动画和确需跨页复用的少量规则；删除已迁移到 JSX 的页面级样式。
7. 对照需求验收标准检查无业务变更：确认未改数据请求、API 调用、路由路径、权限语义、SEO 元信息生成和 admin 代码。
8. 在实现结果中记录仍保留自定义 CSS 的位置、原因和影响范围。

## 测试计划

- 运行 `npm run lint` 或项目可用的 web lint 命令，记录结果。
- 运行 `npm run typecheck` 或项目可用的 web typecheck 命令，记录结果。
- 运行 `npm run build` 或项目可用的 web build 命令，确认 Next.js 编译通过。
- 启动 web 本地页面后检查桌面端和移动端：
  - `/`
  - `/articles`
  - `/articles/[slug]`
  - `/categories/[slug]`
  - `/tags/[slug]`
  - `/photos`
  - `/photos/[id]`
  - `/about`
  - 不存在路径触发的 404
  - 相册加载态和错误态
- 视觉重点检查：文本换行、容器宽度、移动端栅格、照片比例、长标题、标签换行、搜索表单、分页、hover/focus、暗色主题、空态、错误态和 fallback 提示。
- 回归重点检查：搜索 query 和 page 参数、照片筛选参数、文章阅读量展示与上报触发、metadata、JSON-LD、`generateStaticParams` 不因样式迁移发生行为变化。

## 完成检查

- [ ] `apps/web` 范围内既有页面和相关展示组件已完成 Tailwind-first 样式迁移。
- [ ] `apps/web/app/globals.css` 只保留 Tailwind 入口、theme token、base、暗色主题、Markdown/第三方覆盖、必要动画和少量跨页规则。
- [ ] 首页、文章、文章详情、分类、标签、相册、照片详情、关于页、404、加载态、错误态和空态在桌面端与移动端无明显溢出、遮挡、错位或不可读文本。
- [ ] 搜索、分页、照片筛选、主题切换、文章阅读量上报、导航链接和重试按钮行为保持不变。
- [ ] 未修改 `apps/admin`、API、数据库、权限、路由语义、生产配置和 `docs/product`。
- [ ] 静态检查、类型检查、构建检查或可替代验证已记录结果。
- [ ] 如有保留自定义 CSS，已说明原因、影响位置和保留方式。
