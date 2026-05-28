# 实施计划：IT 工程师博主博客体验专业化重设计

## 任务摘要

后续开发分阶段重塑 C 端专业技术博客体验与 Admin CMS 工作台体验。本阶段仅产出实施路线，不开发。

## 当前阶段声明

- 本阶段只更新 `.harness/runs/2026-05-20-005-it-engineer-blog-experience-redesign/artifacts/architecture.md` 与 `implementation-plan.md`。
- 不修改 `apps/`、`docs/product/`、API、数据库、部署配置或 CI/CD。
- 后续进入开发前，主 agent 需要把 `requirement.md`、`architecture.md`、`implementation-plan.md` 汇总给用户人工确认。

## 文件和模块范围

### C 端后续可能涉及

- `apps/web/app/globals.css`：Tailwind v4 `@theme` token、基础排版、状态样式。
- `apps/web/app/layout.tsx`：站点 header/footer/navigation 的统一结构。
- `apps/web/app/page.tsx`：首页内容层级。
- `apps/web/app/articles/page.tsx`：文章列表。
- `apps/web/app/articles/[slug]/page.tsx`：文章详情。
- `apps/web/app/categories/[slug]/page.tsx`：分类归档。
- `apps/web/app/tags/[slug]/page.tsx`：标签归档。
- `apps/web/app/about/page.tsx`：关于页。
- `apps/web/app/not-found.tsx`：404。
- 可新增 `apps/web/components/**` 与 `apps/web/lib/**` 的展示组件和格式化工具。

### Admin 后续可能涉及

- `apps/admin/src/main.tsx`：逐步缩小为启动入口。
- `apps/admin/src/styles.css`：全局布局与必要覆盖，减少杂散页面样式。
- 可新增：
  - `apps/admin/src/app/**`
  - `apps/admin/src/layouts/**`
  - `apps/admin/src/features/auth/**`
  - `apps/admin/src/features/dashboard/**`
  - `apps/admin/src/features/articles/**`
  - `apps/admin/src/features/taxonomy/**`
  - `apps/admin/src/shared/**`

### 明确不涉及

- `apps/api/**`、数据库迁移、生产配置、CI/CD、`docs/product/**`。
- 评论、订阅、统计、多用户协作、审批流、AI 摘要、多语言等 P2 能力。

## 步骤

后续开发按 Phase 0 到 Phase 6 顺序推进；每个阶段完成后由主 agent 汇总结果，必要时暂停给用户审核，再进入下一阶段。

## 分阶段路线图

### Phase 0：人工确认与开发准备

目标：确认方案边界，避免未审核直接开发。

任务：

1. 主 agent 汇总 Requirements + Architecture + Implementation Plan。
2. 用户确认 P0 范围：C 端首页/列表/详情/分类标签/关于/404/空态；Admin 登录鉴权/Layout/文章/分类/标签/反馈状态。
3. 明确 P1 入口处理：Media、Settings、预览、未保存离开确认默认不阻塞 P0。
4. 分配后续开发 agent：至少 Frontend；测试与评审在开发完成后再启动。

人工审核点：

- 是否认可“工程编辑部 + CMS 工作台”的方向。
- 是否接受 Admin 先做单管理员权限边界，不扩展复杂角色矩阵。
- 是否接受本轮不改 API/db/infra。

回滚方式：

- 若方向不满意，只改当前 run artifacts，重新派发 Architect 或 Requirements，不影响业务代码。

### Phase 1：C 端设计系统与共享结构

目标：先稳定 Tailwind v4 token 与全局布局，再改页面。

建议文件范围：

- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/components/site/**`
- `apps/web/components/states/**`

任务：

1. 使用 Tailwind v4 `@theme` 收敛字体、颜色、容器、间距、半径、状态 token。
2. 统一站点 header/footer/navigation；移动端保持可读和可点击。
3. 建立 `EmptyState`、`ErrorState`、基础 `Container` / section pattern。
4. 控制页面背景、分割线、标签和链接样式，避免卡片墙与营销 hero。

人工审核点：

- 截图检查首页首屏是否露出下一段内容线索。
- 检查颜色是否过度单一、过度暖色或紫蓝渐变化。
- 检查移动端导航无遮挡、文本无溢出。

截图验收：

- C 端首页桌面约 1440px。
- C 端首页移动约 390px。
- 站点 404 桌面或移动一张。

回滚方式：

- 回滚 `apps/web/app/globals.css`、`layout.tsx` 和新增共享组件；页面逻辑未改时风险最低。

### Phase 2：C 端核心页面重构

目标：把公开站点从“模板博客”收敛为专业技术阅读体验。

建议文件范围：

- `apps/web/app/page.tsx`
- `apps/web/app/articles/page.tsx`
- `apps/web/app/articles/[slug]/page.tsx`
- `apps/web/app/categories/[slug]/page.tsx`
- `apps/web/app/tags/[slug]/page.tsx`
- `apps/web/app/about/page.tsx`
- `apps/web/app/not-found.tsx`
- `apps/web/components/article/**`

任务：

1. 首页按“身份定位 -> 精选/近期 -> 内容主题 -> 归档/关于”排序。
2. 文章列表统一为可扫描列表，保留标题、摘要、元信息、分类/标签和分页/加载策略。
3. 文章详情统一 `ArticleHeader`、`ArticleMeta`、`Prose`、代码块、宽图和相关文章/上一篇下一篇策略。
4. 分类与标签复用文章列表模式，但文案区分“主题归档”和“横向索引”。
5. 关于页轻量表达专业背景和写作边界，不做简历营销页。
6. 补齐空态、错误态、404 的去向。

人工审核点：

- 随机截取首页、列表、详情，能判断是 IT 工程师技术站。
- 列表不是同质化卡片墙；详情正文宽度受控。
- 分类与标签语言清楚，不混用。

截图验收：

- 首页桌面/移动。
- 文章列表桌面/移动。
- 文章详情桌面/移动，含代码块或长文本场景。
- 分类页或标签页一张。
- 空态一张。
- 404 一张。

回滚方式：

- 若单页体验不达标，逐页回滚对应 `app/**/page.tsx`。
- 若共享组件引发多页问题，先恢复页面内局部结构，再回滚共享组件。

### Phase 3：Admin 全局框架与鉴权状态

目标：先让后台像完整工作台，并把鉴权与反馈集中管理。

建议文件范围：

- `apps/admin/src/main.tsx`
- `apps/admin/src/app/**`
- `apps/admin/src/layouts/AdminLayout.tsx`
- `apps/admin/src/features/auth/**`
- `apps/admin/src/shared/services/apiClient.ts`
- `apps/admin/src/styles.css`

任务：

1. 将 `ConfigProvider`、Ant `App`、theme token 抽到 `app/providers.tsx`。
2. 建立 route metadata：path、menu key、breadcrumb、是否受保护。
3. 建立 `RequireAuth` 或等价 route guard：未登录、恢复中、401、403、登录后 returnTo。
4. 提取 `AdminLayout`：Sider、Menu、Header、Breadcrumb、Content。
5. 建立统一 request error 处理：401/403/session expired 不散落在页面里。
6. 保持现有 session key、API base URL 和路径不变，降低回归风险。

人工审核点：

- 未登录访问 `/articles` 应跳转 `/login?returnTo=/articles`。
- 登录成功后回到目标页或 Dashboard。
- 会话失效提示清楚，不泄露敏感信息。
- Menu selected key 与 Breadcrumb 正确。

截图验收：

- Admin 登录页桌面/窄屏。
- 登录恢复/加载状态。
- Dashboard 工作台框架。
- 403 或会话失效状态（可通过 mock 或手工触发）。

回滚方式：

- 保留旧 `main.tsx` 行为作为对照；拆分阶段每次只移动一类职责。
- 若 route guard 出问题，先恢复旧 parseRoute/navigate 逻辑。

### Phase 4：Admin 文章管理与编辑流程

目标：统一表格、表单、保存/发布反馈，提升 CMS 可靠感。

建议文件范围：

- `apps/admin/src/features/articles/**`
- `apps/admin/src/shared/components/PageHeader.tsx`
- `apps/admin/src/shared/components/DataTableEmpty.tsx`
- `apps/admin/src/shared/components/ConfirmDanger.tsx`
- `apps/admin/src/shared/utils/format.ts`
- `apps/admin/src/styles.css`

任务：

1. 提取文章类型、service、payload/form mapper。
2. 文章列表使用统一 toolbar：状态筛选、分类筛选、标题搜索、新建入口。
3. 表格列控制宽度和响应式策略；标题列可进入编辑。
4. 编辑页统一字段分组、校验、保存草稿、发布、下架/删除确认。
5. 成功用 `message`，持续错误用 `notification` 或页面级状态。
6. 保存失败保留用户输入；提交中禁用重复触发。

人工审核点：

- 新建文章保存成功有反馈并进入编辑页或显示已创建状态。
- 保存失败不清空表单。
- 发布/下架失败保持原状态。
- 表格空态突出“新建文章”入口。

截图验收：

- 文章列表有数据。
- 文章列表空态。
- 新建文章初始态。
- 编辑文章有校验错误。
- 保存成功与保存失败反馈。
- 下架/删除确认弹窗。

回滚方式：

- 若 service 抽离造成请求问题，回滚 service 层并保留 UI 组件。
- 若表单抽离造成字段丢失，回退 `articlePayload` / `articleToForm` 到旧实现。

### Phase 5：Admin 分类/标签与 P1 入口裁定

目标：让内容组织能力与 C 端发现逻辑一致。

建议文件范围：

- `apps/admin/src/features/taxonomy/**`
- `apps/admin/src/shared/components/**`
- `apps/admin/src/app/routes.ts`

任务：

1. 分类管理强调“主题归档”：名称、slug、描述、文章数量或引用提示。
2. 标签管理强调“横向索引”：名称、slug、文章数量、命名治理提示。
3. 删除前确认；被引用时优先阻止或显示明确提示。
4. Media、Settings 若未实现，不出现在可点击主导航；如展示则标记禁用或 P1。

人工审核点：

- 分类和标签文案不混用。
- 空态说明如何开始组织内容。
- 未实现入口不会跳空白页。

截图验收：

- 分类列表有数据/空态。
- 标签列表有数据/空态。
- 分类或标签创建失败反馈。
- 删除确认或引用阻止提示。

回滚方式：

- 分类/标签页面可独立回滚，不影响文章管理主流程。

### Phase 6：统一验收、截图与回归

目标：在开发完成后确认体验闭环，而不是只看代码编译。

检查项：

1. C 端桌面与移动关键页面截图齐全。
2. Admin 登录、鉴权、Dashboard、文章列表、编辑、分类、标签、空态、错误态截图齐全。
3. 运行项目现有 lint/typecheck/build/test，若某项不存在需记录。
4. 使用 `web-design-guidelines` 进行人工 UI 审核：可读性、可访问性、布局稳定、反馈、错误态。
5. 使用 `frontend-design` 审核：是否避免 generic AI aesthetics、营销 hero、模板卡片墙。
6. 使用 `tailwind-design-system` 审核：token 是否集中在 `@theme`，语义是否稳定。
7. 使用 `frontend-architecture` 审核：Admin 是否已从单文件向 route/view/component/service 分层，且没有过度抽象。

人工审核点：

- 用户确认截图和关键流程后，才进入 Reviewer/Release 阶段。
- 若有 API/db/infra 新需求，必须重新开对应 agent，不在前端开发中顺手扩展。

回滚方式：

- 优先按 Phase 回滚；若整体方向不满意，回滚本 run 中后续开发 agent 的变更，不影响本规划 artifact。

## 风险

- Admin 拆分阶段容易引入行为回归，必须每阶段保留手工冒烟路径。
- C 端视觉可能因过度追求“高级感”偏离技术阅读，需以截图和正文阅读体验验收。
- P1/P2 功能容易挤占 P0 时间，后续开发必须按优先级执行。
- 如果现有 API 不支持分页、引用计数、搜索等字段，前端应先降级展示，不扩大本轮范围。

## 测试计划

本阶段不运行应用测试，因为只写规划文档。

后续开发阶段建议：

- C 端：运行 web app 的 lint/typecheck/build；使用浏览器截图验收首页、文章列表、详情、分类/标签、关于、404、空态。
- Admin：运行 admin app 的 lint/typecheck/build；用浏览器手工验收登录、受保护路由、Dashboard、文章列表、编辑、分类、标签、成功/失败反馈。
- 若仓库没有对应脚本，开发 agent 必须在 test report 中说明缺口。

## 完成检查

- [x] 已明确本阶段不开发。
- [x] 已列出 C 端信息架构、视觉方向和 Tailwind v4 设计系统。
- [x] 已列出 Admin Ant Design v5 布局、导航、反馈、状态和鉴权边界。
- [x] 已给出 Admin 从单 `main.tsx` 拆成 route/view/component/service 层的风险控制路径。
- [x] 已给出分阶段文件范围、人工审核点、截图验收和回滚方式。
- [ ] 后续开发前需用户人工确认方案。
