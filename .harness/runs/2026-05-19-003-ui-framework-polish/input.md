# 003 UI 框架化与交互体验优化

## 背景

当前博客系统已经补齐 C 端基础阅读路径和 Admin 路由/鉴权闭环，但界面仍需要进一步产品化：

- Admin 可以引入 Ant Design 这类成熟企业级 UI 框架，减少自研基础组件和交互不一致。
- Admin 需要更多成功、失败、加载、确认和空状态提示，让操作反馈更完整。
- C 端 Web 可以引入 Tailwind CSS，统一布局、响应式和视觉层级，降低 CSS 维护成本。
- 整体界面要更清爽、重点更明确、交互更友好。

## 目标

- 明确 Admin 是否使用 Ant Design v5，以及引入后的布局、导航、表单、表格、消息反馈和主题策略。
- 明确 Web C 端是否使用 Tailwind CSS v4，以及迁移范围、样式组织、响应式和视觉验收标准。
- 输出 UI/交互优化的需求、验收标准、技术方案和实施计划。
- 控制 token 和改动范围，避免把本轮变成无边界重构。

## 非目标

- 规划阶段不写业务代码。
- 不修改数据库 schema。
- 不改生产部署配置或密钥。
- 不把规划内容写入 `docs/product/`。

## 初始需求

- 后台 Admin 可以使用 Ant Design 等 UI 框架。
- Admin 增加更多成功和失败提示，操作反馈更完整。
- 前台 C 端可以加 Tailwind CSS。
- 整体 UI 调整得更清楚，不要这么乱。
- 交互更友好。

## 验收标准

- [ ] `artifacts/requirement.md` 写清 Admin UI、C 端 UI、操作反馈、响应式和交互验收标准。
- [ ] `artifacts/architecture.md` 写清 Ant Design 和 Tailwind CSS 的接入方案、影响范围、风险和边界。
- [ ] `artifacts/implementation-plan.md` 写清开发阶段 agent 分工、迁移顺序、测试和回滚方式。
- [ ] 明确本轮哪些页面必须调整，哪些页面只做兼容检查。
- [ ] 明确成功/失败/加载/确认/空状态的覆盖清单。
- [ ] 规划阶段不修改业务代码。

## 影响范围

- [x] web
- [x] admin
- [ ] api
- [ ] db
- [ ] infra
- [x] docs

## 测试要求

- 规划阶段运行 harness 结构检查。
- 后续开发阶段必须包含 Admin 路由/鉴权流、表单操作反馈、C 端桌面/移动端截图和构建验证。

## 回滚方式

- 规划阶段只写 `.harness/backlog/ready/` 和 `.harness/runs/<run>/artifacts/`。
- 开发阶段如果引入依赖，需要能通过 package.json/package-lock 回滚。
