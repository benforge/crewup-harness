# 实施计划

## 任务摘要

完成 Admin 引入 Ant Design v5、Web C 端引入 Tailwind CSS v4 的前端实施路线、分工、风险与测试计划。

## 文件和模块

- Admin 应用：入口 provider、后台布局、导航、表单、表格、弹窗/确认、消息反馈、加载/空/错误状态。
- Web C 端：全局 CSS、PostCSS/Tailwind 配置、核心阅读路径、列表/详情、导航、基础布局、移动端适配。
- 依赖文件：对应前端 `package.json`、lockfile、PostCSS/Tailwind 配置文件。
- 不涉及：API、数据库、生产部署、密钥、CI/CD、`docs/product/`。

## 步骤

1. Frontend：确认包管理器、Admin/Web 目录、现有路由、鉴权守卫、样式入口和页面清单。
2. Frontend：接入 Ant Design v5，在 Admin 根部增加 `ConfigProvider` 与 `App`，建立主题 token 和消息反馈入口。
3. Frontend：迁移 Admin 外壳与导航，再迁移核心列表、表单、确认弹窗、成功/失败/加载/空状态。
4. Frontend：接入 Tailwind CSS v4，安装 `tailwindcss`、`@tailwindcss/postcss`、`postcss`，配置 PostCSS，并在 Web 全局 CSS 引入 `@import "tailwindcss"`。
5. Frontend：迁移 Web C 端核心阅读路径、列表/详情、导航和响应式布局；非核心页面做兼容检查。
6. Tester：执行构建、Admin 登录/未授权/会话失效流、核心表单/表格操作反馈、Web 桌面与移动端截图回归。
7. Reviewer：检查依赖接入、主题边界、样式冲突、权限边界、可回滚性和是否越过本轮范围。
8. Release：仅在开发与测试完成后整理发布摘要；规划阶段不写 `docs/product/`。

## 风险

- 新 UI 框架与旧 CSS 冲突导致页面局部错位。
- 依赖或 PostCSS 配置与现有构建链不兼容。
- Admin 反馈改造遗漏失败、确认或空状态，造成操作闭环不完整。
- C 端 Tailwind 迁移范围过大，演变为无边界重构。
- 页面清单未完全确认时，实施优先级可能偏离核心路径。

## 降级与回滚

- Ant Design 接入失败：保留现有 Admin 组件，优先补消息/加载/空状态，不强制迁移全部页面。
- Tailwind 接入失败：保留现有 CSS，先整理核心页面样式变量和布局类名，等待构建链确认后再接入。
- 单页迁移破损：回退该页面到旧实现，只保留全局 provider/config 中已验证部分。
- 依赖风险：通过回滚 `package.json`、lockfile、PostCSS/Tailwind 配置恢复。

## 测试计划

- 构建验证：运行现有前端 lint/typecheck/build 命令，以项目已有脚本为准。
- Admin 路由：验证登录页、登录后跳转、受保护页面、未授权/会话失效处理。
- Admin 交互：验证核心表单提交、删除/危险操作确认、表格加载、空数据、失败提示、成功提示。
- Web C 端：验证首页/列表/详情/导航在桌面与移动端的布局、可读性和无明显溢出。
- 回归检查：确认 API/db/infra 未被修改，`docs/product/` 未写入。

## 完成检查

- [ ] `architecture.md` 覆盖影响范围、模块边界、路由与页面结构、鉴权与权限边界、依赖接入、风险与降级。
- [ ] `implementation-plan.md` 覆盖实施步骤、分工、测试计划和回滚方式。
- [ ] 开发阶段未开始前不修改业务代码。
- [ ] 测试通过或已有合理说明。
- [ ] 评审通过后再进入发布摘要。
