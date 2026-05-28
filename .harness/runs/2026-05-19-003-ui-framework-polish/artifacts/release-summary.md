# 发布摘要

## 变更内容

- Admin 侧接入 Ant Design v5，依赖解析为 `antd@5.29.3`，入口使用 `antd/dist/reset.css`、`ConfigProvider`、`App` 与主题 token。
- Admin 后台外壳、导航、表单、表格、确认弹窗、消息提示、加载态、空态和错误态已用 Ant Design 基础组件收敛。
- Admin 登录、受保护路由、未授权/会话失效回登录、退出确认等鉴权 UI 闭环已保留并补齐基础反馈。
- Web C 端接入 Tailwind CSS v4，依赖解析为 `tailwindcss@4.3.0`、`@tailwindcss/postcss@4.3.0`，新增 PostCSS 配置并在全局 CSS 引入 `@import "tailwindcss";`。
- Web 根布局保留现有页面结构，并增加最小 Tailwind 布局增强，包括 body 基础样式、站点 shell、sticky 顶部导航与轻量交互状态。
- 本轮未修改 API 合约、数据库 schema、生产部署、密钥、CI/CD 或 `docs/product/`。

## 用户影响

- Admin 用户获得更统一的后台视觉和操作反馈；登录、保存/发布、下架、创建分类/标签、退出等流程有更明确的成功、失败、加载或确认状态。
- 未登录或会话失效访问 Admin 受保护页面时，仍会被引导回登录页，并保留目标页面跳转信息。
- Web C 端读者侧页面结构保持稳定，新增 Tailwind 基础能力后，后续可更低成本地继续改善首页、列表、详情和移动端体验。
- 现有业务数据、接口语义和内容管理流程不应发生变化。

## 部署步骤

1. 拉取本次变更后安装依赖，确保 lockfile 与工作区依赖一致。
2. 运行全局验证：`npm run typecheck`、`npm run test`、`npm run build`、`npm run harness:check`。
3. 单独验证 Admin：`npm --workspace apps/admin run typecheck`、`npm --workspace apps/admin run build`。
4. 单独验证 Web：`npm --workspace apps/web run typecheck`、`npm --workspace apps/web run build`。
5. 手工验证 Admin 登录、未登录直达受保护路由、会话失效/401/403 回登录、退出确认。
6. 手工验证 Admin 核心操作反馈：文章保存/发布/下架、分类/标签创建、列表加载、空数据、接口失败提示。
7. 手工或截图验证 Web 首页、文章列表、文章详情、分类/标签页、404/空态在桌面和移动端无横向滚动、遮挡、文字溢出或导航重叠。
8. 部署前确认构建产物无阻塞错误；Admin bundle chunk size warning 当前为非阻塞风险，可在后续迭代处理。

## 验证步骤

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run harness:check`
- `npm run harness:verify -- 2026-05-19-003-ui-framework-polish`

## 回滚方式

1. 若 Admin Ant Design 接入引发阻塞问题，回滚 `apps/admin/package.json`、lockfile、Admin 入口 provider/reset CSS、后台页面中 Ant Design 组件迁移相关变更。
2. 若 Web Tailwind 接入引发构建或样式问题，回滚 `apps/web/package.json`、lockfile、`apps/web/postcss.config.mjs`、`apps/web/app/globals.css` 中 Tailwind import 以及 `apps/web/app/layout.tsx` 的 Tailwind class 增强。
3. 若只有单个页面出现视觉破损，优先回滚该页面到旧实现，保留已验证的全局配置。
4. 本轮没有 API/db/infra 变更，无需数据库迁移回滚或生产配置回滚。

## 已知风险/后续建议

- Admin build 存在非阻塞 chunk size warning，建议后续评估路由级拆包或 Ant Design 相关体积优化。
- Admin 表单字段级校验仍偏基础，部分 `Form.Item` 主要展示必填标记，后续可补充统一 `rules` 与校验文案。
- Admin `Table` 局部刷新反馈还可更精细，后续可为表格绑定更明确的 `loading` 状态。
- 删除文章入口未在本轮覆盖；若后续产品范围包含删除，需要补齐删除确认、失败反馈和回归验证。
- Web Tailwind 本轮主要完成依赖接入和根布局最小 polish，首页、列表、详情、404/空态仍建议继续做视觉与响应式细化。
- 当前测试结论主要来自 typecheck/build/test/harness check 与静态审查，仍建议补一轮浏览器桌面/移动端截图回归，以及真实 API 场景下的 Admin 交互验证。

## 关联 run

- `2026-05-19-003-ui-framework-polish`
- 当前 `state.json` 记录阶段为 `release`、状态为 `ready-for-user-review`；release 摘要基于既有 test/review artifacts 整理，未同步 `docs/product/`。
