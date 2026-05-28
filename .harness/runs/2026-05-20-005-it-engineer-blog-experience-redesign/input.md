# 005 IT 工程师博主博客体验专业化重设计

## 背景

当前 C 端博客和后台管理系统在视觉与交互上仍显得不够专业：

- C 端公开页面缺少清晰重点、内容层级和与“IT 工程师博主”身份匹配的专业气质。
- 后台管理系统虽然已有 Admin UI 框架方向，但整体体验仍不像一个完整、可靠、高效的内容管理工作台。
- 用户希望这次不是继续凭主观感觉调样式，而是真正基于已有前端设计、Web 规范和设计系统 skill 做需求划分与方案设计。

## 定位

博主是一名 IT 工程师。整体产品应体现：

- 专业、克制、可信赖。
- 内容以工程经验、技术文章、项目复盘、工具方法、架构思考为主。
- C 端像一个高质量个人技术站，而不是营销落地页、普通模板博客或花哨作品集。
- Admin 像一个高效 CMS 工作台，而不是把所有功能堆在一个页面里的表单集合。

## Skill 与文档依据

本轮规划必须引用和落实已有 skill：

- `frontend-design`：用于确立清晰、非模板化的视觉方向，避免 generic AI aesthetics。
- `web-design-guidelines`：用于检查 Web UI 可用性、可访问性、布局、文字、交互反馈等基础质量。
- `tailwind-design-system`：用于 C 端 Tailwind CSS v4 token、spacing、typography、responsive pattern 设计。
- `information-architecture`：用于重新梳理 C 端与 Admin 的导航、路由层级、内容优先级和用户流。
- `frontend-architecture`：用于组件边界、布局复用、状态与交互反馈方案。

本轮还参考 Context7 当前文档：

- Tailwind CSS v4：CSS-first `@theme`、设计 token、响应式和自定义 utility。
- Ant Design v5：`ConfigProvider` theme token、`Layout` / `Menu` / `Breadcrumb`、`Form` / `Table`、`message` / `notification` 等后台体验模式。

## 目标

- 对 C 端和 Admin 分别做需求拆分、信息架构、视觉方向和交互方案设计。
- 明确 C 端：首页、文章列表、文章详情、分类/标签、关于页、搜索/空态/404 的内容结构、视觉层级和验收标准。
- 明确 Admin：登录、鉴权态、全局布局、侧边导航、内容管理、分类/标签管理、媒体/设置、操作反馈、错误状态、空态和权限边界。
- 给出一套可以人工审核的实施路线图，但本阶段不开发。
- 控制 token：只启动 PM、Requirements、Architect 三类规划 agent，不启动开发、测试、评审、发布 agent。

## 非目标

- 本阶段不修改 `apps/` 业务代码。
- 本阶段不修改 `docs/product/`。
- 不做数据库迁移、API 改造、生产配置、CI/CD 或真实发布。
- 不立即安装新的外部 skill；优先使用当前已存在的本地 skill。
- 不把 C 端做成花哨个人秀，也不把 Admin 做成单页功能堆叠。

## 初始需求

- C 端视觉和交互要更符合“IT 工程师博主”的专业感。
- C 端布局需要更有重点，减少杂乱区块、杂乱线条和同质化卡片。
- Admin 需要完整后台产品感：路由层级、导航、鉴权态、反馈、表格/表单/编辑流程、成功失败提示。
- 方案要能指导后续开发 agent，不要停留在“好看一点、简约一点”的泛泛描述。

## 验收标准

- [ ] `artifacts/requirement.md` 明确 C 端与 Admin 的用户角色、核心场景、页面/路由范围、需求拆分、非目标和验收标准。
- [ ] `artifacts/architecture.md` 明确 C 端与 Admin 的信息架构、布局策略、视觉系统、交互反馈、鉴权边界和风险。
- [ ] `artifacts/implementation-plan.md` 明确后续开发顺序、文件/模块范围、人工审核点、截图验收和回滚方式。
- [ ] 方案明确说明如何使用 `frontend-design`、`web-design-guidelines`、`tailwind-design-system`、`information-architecture`、`frontend-architecture`。
- [ ] 本阶段不修改 `apps/`、不修改 `docs/product/`、不启动开发 agent。

## 影响范围

- [x] web
- [x] admin
- [ ] api
- [ ] db
- [ ] infra
- [x] docs

## 测试要求

- 规划阶段运行 harness 结构检查。
- 后续开发阶段必须包含 C 端与 Admin 的桌面/移动端或关键视口截图验收。
- 后续开发阶段必须包含 Admin 登录/鉴权态、导航跳转、表单提交成功/失败、空态/错误态的交互验收。

## 回滚方式

- 规划阶段仅写入 `.harness/backlog/ready/` 和 `.harness/runs/<run>/artifacts/`。
- 若方案不满意，可直接修改当前 run 的 artifacts 或重新派发 PM/Requirements/Architect agent。
