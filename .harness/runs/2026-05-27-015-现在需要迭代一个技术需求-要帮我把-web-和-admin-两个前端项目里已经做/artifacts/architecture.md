# 架构和影响范围

## 影响范围

- [x] web
- [ ] admin
- [ ] api
- [ ] db
- [ ] infra
- [ ] docs

本轮仅覆盖 `apps/web` 既有公开页面和与页面样式直接相关的组件。`apps/admin`、后端 API、数据库、权限、路由语义、部署配置和 `docs/product` 不进入本轮。

## 历史架构约束

- 延续历史 run `2026-05-19-003-ui-framework-polish` 的决定：`apps/web` 使用 Next.js App Router、React 和 Tailwind CSS v4，Tailwind 入口继续是 `apps/web/app/globals.css` 中的 `@import "tailwindcss";`。
- 延续 `apps/web/.ai/rules.md`：Tailwind CSS v4 是 C 端样式默认实现方式，新增或迁移样式优先使用 utility class，复用 `@theme` token。
- `apps/web/app/globals.css` 继续承担 Tailwind 入口、theme token、base、暗色主题变量、少量跨页 utility、Markdown 内容和第三方渲染覆盖；不继续沉淀单页面布局、卡片、列表、按钮和状态样式。
- 公开阅读、文章归档、分类/标签浏览、相册浏览和照片详情的内容结构、SEO 元信息、数据获取方式保持不变。
- 历史上 admin 已采用 Ant Design v5 作为后台组件层；本轮范围已收敛为 web，因此不触碰 admin 外壳、表单、表格、权限 UI 或 Ant Design 样式策略。

## 方案

### 模块边界

- 页面层：仅迁移 `apps/web/app/**/page.tsx`、`layout.tsx`、`not-found.tsx`、`photos/loading.tsx`、`photos/error.tsx` 中的页面级布局、容器、间距、对齐、排版、响应式、状态展示和交互外观。
- 组件层：仅迁移 `ArticleList`、`MarkdownRenderer`、`PhotoMasonryGrid`、`PhotoFilters`、`PhotoImage`、`EmptyState`、`ErrorState`、`ThemeToggle` 的样式表达；保留组件 props、数据处理、事件语义和可访问性语义。
- 全局样式层：整理 `apps/web/app/globals.css`，保留 `@theme`、`:root`、`.dark`、base selector、Markdown 渲染规则、必要动画和少量跨页面 utility；将可内联到 JSX 的语义 class 样式迁移为 Tailwind class。
- 数据层：`apps/web/lib/api.ts`、`apps/web/lib/site.ts`、`packages/sdk`、`packages/types` 不改。

### 路由与页面结构

| 路由 | 文件 | 本轮样式职责 |
| --- | --- | --- |
| `/` | `apps/web/app/page.tsx` | 首页 hero、重点文章、最近文章、标签区、相册入口迁移为 Tailwind-first |
| `/articles` | `apps/web/app/articles/page.tsx` | 归档页标题、筛选入口、搜索栏、分页、文章列表区域迁移为 Tailwind-first |
| `/articles/[slug]` | `apps/web/app/articles/[slug]/page.tsx` | 文章头部、阅读元信息、封面图、阅读提示、上下篇导航、相关文章区域迁移为 Tailwind-first |
| `/categories/[slug]` | `apps/web/app/categories/[slug]/page.tsx` | 分类头部、统计面板、文章列表和返回操作迁移为 Tailwind-first |
| `/tags/[slug]` | `apps/web/app/tags/[slug]/page.tsx` | 标签头部、统计面板、文章列表和返回操作迁移为 Tailwind-first |
| `/photos` | `apps/web/app/photos/page.tsx` | 相册标题、筛选侧栏、结果栏、照片墙容器迁移为 Tailwind-first |
| `/photos/[id]` | `apps/web/app/photos/[id]/page.tsx` | 照片详情媒体区、说明侧栏、元信息和标签迁移为 Tailwind-first |
| `/about` | `apps/web/app/about/page.tsx` | 关于页内容区、分类列表、写作准则和操作区迁移为 Tailwind-first |
| 404 / 相册状态 | `not-found.tsx`、`photos/loading.tsx`、`photos/error.tsx` | 空态、错误态、加载骨架和重试按钮迁移为 Tailwind-first |
| 根布局 | `apps/web/app/layout.tsx` | 站点 shell、header、nav、footer、skip link、主题按钮外层布局迁移为 Tailwind-first |

### 鉴权与权限边界

- `apps/web` 是公开 C 端站点，本轮不新增登录、会话、受保护路由或未授权跳转。
- 文章、分类、标签、照片页面继续依赖既有公开读取接口和本地 fallback 数据策略。
- `ArticleViewTracker` 的阅读量上报语义不变，不把样式迁移扩展为行为变更。

### 接口 / 数据依赖

- 保持 `loadPublishedArticles`、`loadPublishedArticle`、`loadCategories`、`loadTags`、`loadPhotos`、`loadPhoto`、`filterPhotos`、`getPhotoFilterOptions` 等现有调用不变。
- 保持 `generateMetadata`、`generateStaticParams`、JSON-LD、canonical、OpenGraph 字段逻辑不变。
- 不新增接口、不调整响应字段、不修改 SDK/type 契约、不改数据库迁移。

### Tailwind v4 约束

- 继续使用 Tailwind CSS v4 CSS-first 模式，复用 `@theme` 中的颜色、字体、半径和容器 token。
- JSX 中优先使用 Tailwind utility class 表达布局、间距、字号、边框、背景、hover/focus、暗色主题、响应式断点和状态样式。
- 对动态比例、Markdown 内容、滚动表格、代码块、照片加载动画等 Tailwind utility 不易覆盖或来自第三方渲染的场景，可保留少量全局 CSS，并在实现结果中说明保留原因。
- 不引入新的 UI 框架、状态管理库、样式库或全局组件体系。

## 本次延续 / 推翻 / 新增的决策

- 保持 `apps/web` 继续以 Tailwind CSS v4 为主要样式方式；`globals.css` 保留 token、base、暗色主题和 Markdown/第三方覆盖职责。
- 保持公开页面的路由、数据获取、SEO、fallback、错误态和空态语义不变。
- 原始 `web + admin` 双项目迁移范围不再适用，本轮只做 `apps/web`。
- 将既有 web 页面中的语义 class 样式迁移到 JSX Tailwind utility class，并把全局 CSS 收敛为跨页基础能力。
- frontend agent 需要按页面族分批迁移并进行桌面端、移动端和状态路径视觉验证。

## 风险

- 全局样式收敛可能影响多个页面共用的类名，降级方式是优先保留跨页基础规则，按页面逐步删除已迁移规则。
- Markdown 渲染、代码块、表格、checkbox、图片等由 `react-markdown` 生成的内容无法完全依赖页面 JSX class，降级方式是在 `globals.css` 保留 `.markdown-body` 和 `.markdown-table-wrap` 相关规则。
- 照片墙依赖 CSS columns、动态 `aspectRatio` 和图片 fallback，迁移时需保留稳定宽度、断点和比例，避免移动端溢出。
- 暗色主题依赖 `.dark` 变量和 `ThemeToggle` 行为，迁移按钮外观时不能改变 localStorage key、`aria-pressed`、`colorScheme` 和系统主题监听。
- 大量 class 迁移容易造成视觉回归，需通过核心页面桌面端与移动端截图检查、长文本换行、hover/focus、加载态、错误态和空态检查降低风险。
