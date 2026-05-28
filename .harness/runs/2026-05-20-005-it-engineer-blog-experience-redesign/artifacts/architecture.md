# 架构和体验方案：IT 工程师博主博客体验专业化重设计

## 阶段边界

本阶段仅作为 Architect Agent 输出方案设计，不开发、不修改 `apps/`、不修改 `docs/product/`，也不启动开发、测试、评审或发布 agent。后续开发必须先经过人工审核确认。

本方案依据：

- `requirement.md` 中 PM + Requirements 已确认的 P0/P1/P2 边界。
- 当前实现事实：C 端为 Next App Router；Admin 为 Vite React + Ant Design v5，核心 UI/路由仍集中在 `apps/admin/src/main.tsx`。
- 本地 skill：`frontend-design`、`web-design-guidelines`、`tailwind-design-system`、`information-architecture`、`frontend-architecture`。
- Context7 文档结论：Tailwind CSS v4 使用 CSS-first `@theme`；Ant Design v5 使用 `ConfigProvider` theme token、组件级 token 与 `Layout/Menu/Breadcrumb/Form/Table/message/notification` 等组合。

## 影响范围

- [x] web：C 端公开博客的信息架构、视觉系统、页面结构、状态模式。
- [x] admin：后台 CMS 工作台的信息架构、路由模型、鉴权状态、Ant Design 使用规范、前端模块拆分。
- [ ] api：本阶段不改 API 契约；仅标注后续可能依赖的错误状态、分页、引用计数等数据需求。
- [ ] db：本阶段不做 schema、迁移、索引或种子数据修改。
- [ ] infra：本阶段不做部署、环境变量、CI/CD 或生产配置。
- [x] docs：仅更新当前 run 的 artifacts。

## 方案

本方案把产品拆为两条体验线：C 端公开站点负责建立“可信 IT 工程师博主”的阅读品牌，Admin 后台负责形成可持续生产内容的 CMS 工作台。C 端以 Tailwind CSS v4 的 CSS-first token 与页面模式沉淀视觉系统；Admin 以 Ant Design v5 的 `ConfigProvider`、`Layout`、`Menu`、`Breadcrumb`、`Table`、`Form`、`message` 和 `notification` 建立企业级后台交互一致性。后续开发应先完成 P0 信息架构和基础体验，再进入 P1 增强。

## 信息架构

### C 端站点地图

```text
公开站点
├─ 首页 `/`
│  ├─ 博主身份与技术方向
│  ├─ 精选/近期文章入口
│  ├─ 内容主题入口：工程实践、架构思考、项目复盘、工具方法
│  └─ 关于与全部文章入口
├─ 文章列表 `/articles`
│  ├─ 全部文章列表
│  ├─ 分类/标签跳转入口
│  ├─ 分页或加载更多
│  └─ 空态/错误态
├─ 文章详情 `/articles/[slug]`
│  ├─ 标题、摘要、元信息
│  ├─ 正文、代码块、图片、引用、表格
│  ├─ 目录/锚点（P1 可增强）
│  └─ 上一篇/下一篇或相关文章
├─ 分类归档 `/categories/[slug]`
│  ├─ 分类说明
│  └─ 该分类文章列表
├─ 标签归档 `/tags/[slug]`
│  ├─ 标签说明或文章数量
│  └─ 该标签文章列表
├─ 关于 `/about`
│  ├─ 身份定位
│  ├─ 技术方向与写作边界
│  └─ 文章/分类入口与外部链接
└─ 404 `not-found.tsx`
   ├─ 页面不存在说明
   └─ 返回首页/文章列表/归档入口
```

导航模型：

- 主导航控制在 3-4 项：`首页`、`文章`、`关于`，若后续有明确内容规模再加入 `分类` 或 `系列`。
- 分类与标签不放成大面积标签云；优先作为文章卡片元信息和详情页元信息的上下文入口。
- 移动端采用简化顶部导航，避免复杂多级菜单；所有入口需保持 44px 左右的可点击高度。
- 站点每个 P0 页面都必须有返回文章列表或首页的路径，避免死胡同。

### Admin 路由层级与导航模型

Admin 是独立后台应用，以下路径均指 Admin 应用内路由，不与 C 端同源路径混淆：

| 层级 | 路由 | 导航归属 | 鉴权 | 说明 |
| --- | --- | --- | --- | --- |
| Public | `/login` | 不进入侧边菜单 | 公开 | 登录页；支持 `returnTo` |
| Protected | `/dashboard` | 工作台 | 需要登录 | 内容概况、最近内容、快捷入口 |
| Protected | `/articles` | 内容 / 文章 | 需要登录 | 表格、筛选、搜索、分页、行操作 |
| Protected | `/articles/new` | 内容 / 文章 | 需要登录 | 新建文章；不作为一级菜单常驻 |
| Protected | `/articles/:id` | 内容 / 文章 | 需要登录 | 编辑文章；不作为一级菜单常驻 |
| Protected | `/taxonomy/categories` | 内容组织 / 分类 | 需要登录 | 分类主主题归档管理 |
| Protected | `/taxonomy/tags` | 内容组织 / 标签 | 需要登录 | 标签横向索引管理 |
| Protected P1 | `/media` | 资源 | 需要登录 | 基础媒体管理，P1 |
| Protected P1 | `/settings` | 设置 | 需要登录 | 站点、博主、SEO 基础配置，P1 |

导航模型：

- 使用 Ant Design `Layout` 构建左侧 `Sider` + 顶部 `Header` + 主 `Content`。
- `Menu` 分组建议为：`工作台`、`内容`、`内容组织`、`系统`。P1 未实现入口默认隐藏或禁用，不跳空白页。
- 新建/编辑文章属于文章管理的子任务，通过按钮、表格行和 Breadcrumb 进入，不直接占据主菜单。
- `Breadcrumb` 基于 route metadata 生成，例如：`内容 / 文章 / 编辑文章`，帮助管理员确认当前位置。
- 顶部区域保留当前用户、会话操作、查看前台入口；不堆统计卡片。

## 视觉方向

### C 端：工程化个人技术站

设计方向为“克制的工程编辑部”：像一位 IT 工程师长期维护的专业技术站，而不是营销落地页、作品集或泛模板博客。

关键原则：

- 首屏回答“作者是谁、写什么、从哪里开始读”，但不做夸张 hero、不做转化漏斗、不使用浮夸 CTA。
- 页面结构以文本、元信息、归档关系和阅读节奏为核心；文章列表采用可扫描的 editorial list，不做同质化卡片墙。
- 视觉记忆点来自排版、节奏、少量工程化线条、稳定的内容密度和清楚的技术标签，而不是装饰渐变、漂浮元素或复杂动效。
- 正文最大阅读宽度控制在约 720-780px；代码块、表格和图片有明确溢出策略。
- 文案使用具体工程语言，如“工程实践”“架构设计”“项目复盘”“工具方法”，避免“极致、赋能、颠覆、全网最强”等营销词。

### Admin：高效 CMS 工作台

Admin 方向为“密度适中、任务优先、状态可靠”的 CMS 工作台。

关键原则：

- 信息密度高于 C 端，但不过度拥挤；表格、表单和反馈模式要一致。
- 所有页面先回答“当前在哪、能做什么、操作结果是什么”。
- Dashboard 不做数据分析产品；只做内容概况、待处理入口和快速操作。
- 编辑页优先减少发布不确定性：保存中、保存成功、校验失败、网络失败、权限失败都必须可辨认。
- 危险操作使用 `Modal.confirm` 或等价确认模式；删除、下架、退出登录不可静默执行。

## C 端 Tailwind CSS v4 设计系统

### Token 策略

使用 Tailwind v4 CSS-first 模式，在 `apps/web/app/globals.css` 顶层 `@theme` 定义设计 token。`@theme` 不嵌套在 selector 或 media query 内，token 同时作为 utility 来源和 CSS 变量来源。

建议 token 分层：

| 类型 | 建议 token | 用途 |
| --- | --- | --- |
| 字体 | `--font-sans`、`--font-serif`、`--font-mono` | 中文正文、标题气质、代码块 |
| 颜色 | `--color-canvas`、`--color-surface`、`--color-ink`、`--color-muted`、`--color-rule`、`--color-accent`、`--color-accent-soft` | 页面底、纸面、正文、次级文字、分割线、重点链接 |
| 状态 | `--color-success`、`--color-warning`、`--color-danger`、`--color-info` | 空态、错误、提示，不滥用彩色 |
| 半径 | `--radius-sm`、`--radius-md`、`--radius-lg` | 控制在 8px 以内，标签可 pill |
| 容器 | `--container-page`、`--container-reading`、`--container-wide` | 页面、正文、宽图/表格 |
| 间距 | `--spacing-page-x`、`--spacing-section`、`--spacing-stack`、`--spacing-prose` | 页面边距、区块节奏、列表间距 |
| 动效 | `--ease-quiet`、`--animate-fade-in` | 轻量进入和 hover，不做炫技 |

颜色建议避免单一紫蓝或营销渐变。当前已有暖纸面 + 深墨色 + 绿色 accent 的方向可继续收敛，但需要控制米色/绿色占比，加入中性灰、代码底色和状态色，让站点不像单一色系模板。

### 字体与排版

- 中文正文优先稳定可读的 sans；标题可使用 serif 或更具编辑感的标题字体，但要控制字重。
- 代码块必须使用 `--font-mono`，并定义背景、边框、横向滚动和小字号策略。
- `h1` 仅用于页面主标题；列表、侧栏、卡片内标题使用更小层级，避免 hero 字号泛滥。
- 正文 `line-height` 建议 1.75-1.9；列表页摘要 1.6-1.75。
- 不使用负 letter-spacing；长 slug、URL、代码和标签需 `overflow-wrap` 或横向滚动策略。

### Spacing 与 Container

- 页面容器：桌面约 1080-1120px，移动端保留 14-20px 横向边距。
- 正文容器：720-780px；宽媒体可扩展到 960px，但不得破坏正文节奏。
- 首页首屏必须露出下一段内容线索；不做全屏营销 hero。
- 文章列表采用纵向列表 + 分割线；每条文章高度由内容自然决定，但 meta、标题、摘要顺序固定。

### 模式库

- 列表模式：`ArticleList` / `ArticleListItem` 复用到 `/articles`、分类、标签、相关推荐。展示标题、摘要、发布时间、分类、标签、阅读时间。
- 文章模式：`ArticleHeader`、`ArticleMeta`、`Prose`、`CodeBlock`、`ArticleNavigation`、`RelatedArticles`。
- 标签模式：标签作为轻量 metadata chip，优先服务检索；不做视觉标签云主体验。
- 空态模式：`EmptyState` 必须说明“当前没有什么、为什么可能为空、下一步去哪”；不同于网络错误。
- 错误模式：`ErrorState` 不暴露堆栈；提供重试或回到稳定入口。

## Admin Ant Design v5 方案

### 全局配置

- 使用 `ConfigProvider` 包裹应用，集中配置 `theme.token`、`components`、`componentSize` 和必要 locale。
- 使用 Ant Design `App` 包裹，以便通过 `App.useApp()` 获得 context-aware 的 `message`、`notification`、`modal`。
- 全局 token 建议：`colorPrimary` 使用克制技术蓝或蓝绿；`borderRadius` 4-6；`fontSize` 14；`wireframe` 不启用。
- 组件级 token 用于 `Layout`、`Menu`、`Table`、`Form`、`Card`，不要靠全局 CSS 大面积覆盖 Ant 内部 class。

### 布局与导航

- `Sider`：宽度 240-264px，承载品牌、分组 Menu、查看前台入口；移动端可折叠。
- `Header`：高度稳定，承载当前用户、会话状态、退出登录、必要全局操作。
- `Content`：每页使用统一 `PageHeader`、`Breadcrumb`、操作区和主体区。
- `Breadcrumb`：由 route config 生成，避免各页手写。
- 页面主体不嵌套卡片；卡片仅用于独立数据块、表格容器或表单分组。

### 表格、表单与反馈

- 表格：统一 `Table` 空态、加载、分页、列宽、行操作。标题列可点击进入编辑；状态列使用 `Tag`，状态语言与 C 端发布可见性一致。
- 筛选：文章列表使用轻量 toolbar，包含状态、分类、关键字搜索；复杂批量操作列为 P2。
- 表单：统一 `Form layout="vertical"`，字段校验与错误文案落在字段附近；提交中禁用重复提交。
- 保存/发布：短成功反馈用 `message.success`；长错误或需要行动的错误用 `notification` 或页面级 `Alert/Result`。
- 危险操作：下架、删除、退出使用 `modal.confirm`，确认文案必须说明影响。
- Loading：整页初次加载使用页面级 `Spin` 或 skeleton；局部操作使用按钮 loading，不遮蔽整个工作台。
- Empty/Error：空表格用 Ant `Empty` + 主行动按钮；403/404/会话失效用 `Result` 或登录重定向，不展示原始错误堆栈。

### 鉴权态与权限边界

| 状态 | 处理方式 |
| --- | --- |
| 未登录访问受保护路由 | 跳转 `/login?returnTo=<target>` |
| 正在恢复会话 | 显示稳定的全屏检查状态 |
| 登录失败 | 表单内错误 + `message.error`，不泄露敏感细节 |
| 401 会话失效 | 清理本地 token，跳转登录，提示重新登录 |
| 403 无权限 | 显示无权限状态或跳转登录，提示当前账号无权访问 |
| 已登录访问 `/login` | 跳转 `returnTo` 或 `/dashboard` |

当前 MVP 可按单管理员能力实现，但路由 guard、API 错误处理和 UI 操作边界要为后续角色权限预留，不把权限判断散落在每个按钮里。

## 模块边界与前端架构拆分建议

### C 端

保留 Next App Router 页面结构，建议逐步沉淀共享模块：

```text
apps/web/app/
├─ layout.tsx
├─ globals.css
├─ page.tsx
├─ articles/
├─ categories/
├─ tags/
└─ about/
apps/web/components/
├─ site/SiteHeader.tsx
├─ site/SiteFooter.tsx
├─ article/ArticleList.tsx
├─ article/ArticleCard.tsx
├─ article/ArticleMeta.tsx
├─ article/Prose.tsx
└─ states/EmptyState.tsx
apps/web/lib/
├─ content.ts
├─ site.ts
└─ format.ts
```

拆分原则：先抽稳定重复模式，不为了“组件化”拆碎一次性页面；数据读取仍沿用现有 `lib` 能力，避免在体验重设计中顺手改 API。

### Admin

Admin 当前单 `main.tsx` 已包含路由、鉴权、请求、状态、页面和组件。后续需要低风险分层，先保持行为一致，再拆 UI。

建议目标结构：

```text
apps/admin/src/
├─ main.tsx
├─ app/App.tsx
├─ app/providers.tsx
├─ app/router.tsx
├─ app/routes.ts
├─ layouts/AdminLayout.tsx
├─ features/auth/
│  ├─ LoginView.tsx
│  ├─ authService.ts
│  ├─ authStore.ts
│  └─ requireAuth.tsx
├─ features/dashboard/
│  └─ DashboardView.tsx
├─ features/articles/
│  ├─ ArticleListView.tsx
│  ├─ ArticleEditorView.tsx
│  ├─ articleService.ts
│  ├─ articleTypes.ts
│  └─ articleForm.ts
├─ features/taxonomy/
│  ├─ CategoryListView.tsx
│  ├─ TagListView.tsx
│  ├─ taxonomyService.ts
│  └─ taxonomyTypes.ts
├─ shared/components/
│  ├─ PageHeader.tsx
│  ├─ DataTableEmpty.tsx
│  └─ ConfirmDanger.tsx
├─ shared/services/apiClient.ts
├─ shared/utils/format.ts
└─ styles.css
```

风险控制：

- 第一步只提取纯类型、API client、路由 metadata，不改变 UI。
- 第二步提取 layout 和 page view，保持现有路径、session key、接口路径不变。
- 第三步提取 feature service 与 form helpers，补齐错误/空态模式。
- 每一步后做手工冒烟：登录、Dashboard、文章列表、新建、编辑、发布/下架、分类、标签。
- 不在拆分阶段引入新的状态库或路由库，除非后续开发确认当前手写路由成为明确阻塞。

## 接口 / 数据依赖

本阶段不要求改 API，但后续实现需要确认以下能力是否已存在或可降级：

- C 端文章列表：公开文章、分页、分类、标签、发布时间、摘要、阅读时间或可计算字数。
- C 端详情：文章正文、元信息、分类/标签、上一篇/下一篇或相关文章。
- C 端归档：分类/标签存在性、描述、相关文章列表。
- Admin：登录、`/me`、文章 CRUD、发布/下架、分类/标签列表与创建。
- P1/P2 才需要：媒体上传、设置、引用计数、标签合并、搜索索引、复杂权限矩阵。

若 API 不支持某些 P0 UI 字段，前端开发应优先降级展示已有字段，而不是扩大后端范围。

## 风险与降级

| 风险 | 影响 | 降级策略 |
| --- | --- | --- |
| C 端视觉过度装饰 | 变成营销页或作品集 | 回到列表、正文、归档三类核心模式；减少装饰区块 |
| Tailwind token 过多 | 后续维护困难 | 只保留语义 token 与少量布局 token，避免页面级 token 泛滥 |
| Admin 单文件拆分过猛 | 行为回归、难以定位错误 | 按类型/API/路由/Layout/View 分阶段拆，每阶段人工验收 |
| P1 功能挤入 P0 | 范围膨胀 | P1 入口隐藏或禁用，不影响 P0 骨架验收 |
| 鉴权状态遗漏 | 后台可信度下降 | 将 401/403/session expired 处理集中到 api client 和 route guard |
| 空态/错误态不足 | 页面像坏掉或不可靠 | 每个 P0 页面验收时强制截图空态/错误态 |

## 完成定义

- `architecture.md` 给出 C 端与 Admin 的 IA、视觉方向、设计系统、Ant Design 方案、鉴权边界和模块拆分。
- `implementation-plan.md` 给出后续开发路线、文件范围、人工审核点、截图验收和回滚方式。
- 本阶段不修改任何业务代码，不运行应用测试；仅可做文档结构复核。
