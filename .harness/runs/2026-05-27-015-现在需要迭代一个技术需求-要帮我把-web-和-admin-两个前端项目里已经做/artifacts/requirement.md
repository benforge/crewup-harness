# 需求说明

## 背景

用户已确认本轮只处理 `apps/web`：把 web 项目之前已经开发完成的页面全部重构为 Tailwind CSS 优先写法。该需求属于前端样式迁移与样式规则收敛，不改变业务逻辑、API、数据库、权限、路由语义或数据获取方式。

本轮目标是在不改变既有页面功能和内容结构的前提下，减少分散自定义 CSS，推动页面布局、间距、宽度、对齐、响应式、状态样式和外层视觉表达迁移到 Tailwind utility class。

## 过往背景

- 原始需求曾同时提到 `web` 和 `admin` 两个前端项目的 Tailwind 优先迁移。
- 用户最新确认范围已收敛为只做 `apps/web`，并明确可以开始。
- 相关历史 run `2026-05-19-003-ui-framework-polish` 已完成 web 侧 Tailwind CSS v4 接入，`apps/web` 已具备 Tailwind-first 的工程基础。
- `apps/web/.ai/rules.md` 已约定 Tailwind CSS v4 是 C 端样式默认实现方式，`app/globals.css` 主要承担 Tailwind 入口、theme token、base、少量跨页面 utility 和 Markdown/第三方样式覆盖。

## 复用的历史决策

- 继续沿用 `apps/web` 的 Next.js App Router、React、Tailwind CSS 技术栈。
- 继续沿用 Tailwind CSS v4 与 `@import "tailwindcss";` 的接入方式。
- 继续复用 `app/globals.css` 中已有 theme token 和基础规则，不引入新的大型 UI 框架或全局设计体系。
- 继续保持 web C 端服务公开阅读、内容发现、分类/标签浏览和照片内容浏览的体验定位。
- 继续保持现有 API、数据库、部署边界和共享 SDK/type 契约不变。

## 与历史方案的冲突或变化

- 本轮从原始的 `web + admin` 双项目迁移，变更为仅覆盖 `apps/web`。
- `admin` 侧 Ant Design v5、后台外壳、表单、表格、权限 UI 和后台页面样式均不进入本轮。
- 历史方案中 web 侧已有 Tailwind 基础增强，本轮在此基础上进一步迁移既有页面的具体样式表达，而不是重新接入 Tailwind。
- `app/globals.css` 可做样式边界整理，但不得继续沉淀单页面布局、卡片、列表、按钮和一次性状态样式。

## 目标

- 将 `apps/web` 中已经开发完成的既有页面样式，迁移为 Tailwind CSS 优先写法。
- 用 Tailwind utility class 覆盖页面布局、容器宽度、间距、排版、对齐、响应式、交互状态、加载态、错误态、空态和分页/筛选等可视状态。
- 收敛或移除可被 Tailwind 替代的自定义 CSS，使 `app/globals.css` 保持基础入口与跨页规则定位。
- 保持重构前后的页面功能、数据展示、路由语义和用户操作流程一致。
- 为后续 `apps/web` 新增页面延续 Tailwind-first 写法提供清晰边界。

## 非目标

- 不处理 `apps/admin`。
- 不调整 Ant Design、后台页面、后台布局、后台权限或后台交互。
- 不修改业务逻辑、API 契约、数据库结构、权限规则、路由语义、数据请求方式或生产配置。
- 不引入新的 UI 框架、状态管理方案或大型设计系统。
- 不以本轮名义重做信息架构、内容模型、视觉品牌方向或页面功能。

## 验收标准

- AC-1：`apps/web` 既有公开页面均完成 Tailwind CSS 优先样式迁移，页面级布局、间距、排版、卡片、列表、按钮、标签、图片容器和状态样式不再主要依赖自定义 CSS。
- AC-2：首页、文章列表页、文章详情页、照片相关页面、分类页、标签页、关于页及 404/异常页面在桌面端和移动端均无明显溢出、遮挡、错位或文本不可读。
- AC-3：加载态、错误态、空态、分页、筛选、导航交互、链接 hover/focus 等既有状态在重构后仍可见、可理解、可操作。
- AC-4：`apps/web/app/globals.css` 仅保留 Tailwind 入口、theme token、base、少量跨页 utility、Markdown 或第三方覆盖；被迁移页面不再向其中增加单页面样式规则。
- AC-5：重构不改变页面路由、数据来源、API 调用、权限语义、SEO 元信息生成逻辑和内容展示字段。
- AC-6：如存在无法合理迁移到 Tailwind utility class 的样式，Frontend Agent 需在结果中说明原因、影响位置和保留方式。
- AC-7：`apps/admin`、API、数据库、infra、`docs/product` 在本轮无业务改动。

## 影响范围

- [x] web
- [ ] admin
- [ ] api
- [ ] db
- [ ] infra
- [ ] docs

具体文件范围以 `apps/web` 既有页面、相关组件样式 class、响应式 class、状态样式，以及必要的 `apps/web/app/globals.css` 样式边界整理为主。

## 测试要求

- 运行 web 项目可用的静态检查、类型检查或构建检查；若项目脚本有限，需记录实际执行命令和结果。
- 对 `apps/web` 核心页面进行桌面端与移动端视觉检查，重点覆盖首页、文章列表、文章详情、照片、分类、标签、关于页、404/异常状态。
- 检查加载态、错误态、空态、分页、筛选、导航 hover/focus、图片比例和长文本换行。
- 确认重构未引入 API、数据库、权限、路由语义或 admin 侧变更。

## 回滚方式

- 本轮为样式迁移，回滚边界以 Git 变更为准，可通过 revert 本次 `apps/web` 样式相关提交恢复。
- 若仅个别页面出现视觉回归，可优先回退该页面或组件的 Tailwind class 调整。
- 若 `apps/web/app/globals.css` 整理导致跨页影响，可回退该文件相关变更，并保留已验证无影响的页面级 Tailwind 迁移。
- 本轮不包含数据库迁移、API 改造、权限改造或生产配置变更，因此无需数据回滚步骤。
