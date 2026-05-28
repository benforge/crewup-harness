# requirements 上下文包

- runId（运行 ID）：2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做
- 上下文模式：full
- 生成时间：2026-05-27T10:31:12.223Z
- 升级原因：task mentions high-risk keyword: 迁移

## 允许修改范围

- .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/artifacts/requirement.md

## 项目 Overlay

# Project Overlay: New project

- overlay: .harness/project/ai/profile.yaml
- language.communication: zh-CN
- language.artifacts: zh-CN
- discovered_scopes: 6
- matched_scopes: admin, web

## Project Rule Files

- .harness/project/ai/rules/language.md
- .harness/project/ai/rules/domain-blog.md
- apps/admin/.ai/rules.md
- apps/web/.ai/rules.md

## .harness/project/ai/rules/language.md

# 项目语言规则

- 默认使用中文沟通、记录和汇总。
- 需求、方案、实施计划、测试报告、评审报告、发布摘要和交接记录默认使用中文。
- 代码标识、文件路径、API 名称、库名、命令、错误信息和行业通用技术术语可以保留英文。
- 引用外部英文文档时，用中文总结关键结论，不整段复制英文原文。
- 代码注释默认中文；如果周围文件已有英文注释风格，可保持局部一致。

## .harness/project/ai/rules/domain-blog.md

# 当前项目领域规则

- 本项目是个人博客/内容管理系统，核心体验包括公开阅读、分类/标签、文章详情、后台内容管理和基础站点信息。
- C 端体验优先服务阅读和内容发现，不把后台管理式控件直接暴露给普通访问者。
- 后台管理需求要关注模块独立性、受保护路由、登录态、退出、错误提示和刷新后的状态恢复。
- 内容相关变更要注意 SEO、移动端阅读体验、空状态、缺省数据和异常数据展示。
- 需求若只描述风格词，比如“高级”“专业”“简约”，必须转化为可验收的信息层级、布局、色彩、交互和响应式标准。

## apps/admin/.ai/rules.md

# apps/admin AI 规则

- 作用域：`apps/admin`，面向内容管理后台；只有任务命中 `admin` scope 或 `apps/admin/**` 时加载。
- 技术栈以当前工程为准：Vite、React、Ant Design、Tailwind CSS；优先沿用已有表单、表格、导航、状态和样式模式。
- 管理端组件层继续以 Ant Design 为主，Tailwind 作为布局、间距、尺寸、对齐、响应式和页面外壳的默认样式手段。
- 管理端新页面、新布局和迁移范围内的改动优先使用 Tailwind utility class；不要再新增一套以自定义 CSS 为中心的页面级样式体系。
- 现有自定义 CSS 要按批次迁移为 Tailwind utility class，只有少量全局变量、第三方样式覆盖或 Tailwind 无法优雅表达的局部场景才保留自定义 CSS。
- 不要用 Tailwind 去重写 Ant Design 的基础组件能力，但可以用 Tailwind 调整外层布局、间距、宽度、栅格、空白和视觉节奏。
- 后台改动必须关注登录态、受保护路由、刷新保持、退出、权限失败、表单校验和错误提示。
- 列表和表单需求要明确加载态、空态、提交中、提交成功、提交失败、重试和边界数据表现。
- 后台只管理内容和运营配置，不把 C 端营销式展示结构直接搬进管理端。
- 涉及文章、分类、标签、照片、媒体资源等数据时，同步检查 `packages/types` 和 `packages/sdk` 的契约影响。
- 验证记录至少说明关键后台路径、登录/未登录状态和一条失败路径；无法验证时写明原因。

## apps/web/.ai/rules.md

# apps/web AI 规则

- 作用域：`apps/web`，面向公开访问的 C 端博客站点；只有任务命中 `web` scope 或 `apps/web/**` 时加载。
- 技术栈以当前工程为准：Next.js App Router、React、Tailwind CSS；先读现有路由、组件、样式和数据请求模式，再改动。
- Tailwind CSS v4 是 C 端样式默认实现方式：新增页面/组件样式优先写 Tailwind utility class，复用 `app/globals.css` 中 `@theme` token，不再默认新增页面级语义 class。
- `app/globals.css` 已经较大，只作为 Tailwind 入口、theme token、base、少量跨页面 utility 和 Markdown/第三方样式覆盖使用。除非有明确架构理由，不要继续向其中追加单页面布局、卡片、列表、按钮和状态样式。
- 需要自定义 CSS 时，必须在 run 结果中解释原因，并尽量使用 Tailwind v4 `@theme`、`@utility` 或局部组件封装，避免把一次性样式升级为全局契约。
- C 端体验优先服务阅读、内容发现、分类/标签浏览和照片内容浏览，不引入后台管理式控件。
- 页面改动必须考虑桌面和移动端布局、加载态、空态、错误态、404/异常数据和 SEO 元信息。
- 涉及 API 数据时优先复用 `packages/sdk` 和 `packages/types`，不要在页面里重复定义会漂移的接口类型。
- 不为单个页面需求引入新的大型状态管理、UI 框架或全局设计体系；确需引入时先写入架构风险和替代方案。
- 视觉调整要转化为可验收标准，例如信息层级、响应式断点、可读性、图片比例、交互状态和截图验证路径。

## 相关文件

### .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/artifacts/requirement.md
- 字节数：606

```text
# 需求说明

## 背景

说明为什么要做这个需求。

## 过往背景

- 相关历史 run：请先阅读 `logs/context/related-runs.md`。
- 复用的历史背景：
- 如果未命中相关历史 run，请写明：未命中相关历史 run。

## 复用的历史决策

-

## 与历史方案的冲突或变化

-

## 目标

- 

## 非目标

- 

## 用户故事

- 作为「」，我希望「」，以便「」。

## 验收标准

- [ ] AC-1：

## 影响范围

- [ ] web
- [ ] admin
- [ ] api
- [ ] db
- [ ] infra
- [ ] docs

## 测试要求

- 

## 回滚方式

- 

## 待确认问题

- 

```

## 统计

- 候选文件数：1
- 已纳入文件数：1
- 已纳入字节数：606
