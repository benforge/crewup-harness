# 004 C 端视觉与内容层级专项优化

## 背景

上一轮 UI 框架化迭代完成了 Admin Ant Design v5 接入、Web Tailwind CSS v4 基础接入和根布局增强，但用户对 C 端实际观感仍不满意：

- C 端布局内容仍显得乱。
- 区块线条、分隔关系和内容模块之间的节奏杂乱。
- 页面缺少更专业的内容排版、留白、主次关系和视觉聚焦。
- 需要引用成熟前端网站设计 skill 来支撑后续方案，避免只凭主观调样式。

## Skill 候选

通过 `npx skills find` 搜索并初步筛选，建议本轮规划引用以下高安装量 skill 作为设计支撑：

- `anthropics/skills@frontend-design`：约 430K installs，适合前端设计质量、视觉层级和可用性判断。
- `vercel-labs/agent-skills@web-design-guidelines`：约 329K installs，适合现代 Web 页面布局、内容站点和视觉规范。
- `wshobson/agents@tailwind-design-system`：约 42.8K installs，适合 Tailwind 设计系统、spacing/token 和 utility 组织。

低安装量 `ux review` 搜索结果暂不作为主支撑，只可作为后续补充参考。

## 目标

- 重新规划 C 端 Web 的首页、文章列表、文章详情、分类/标签、404/空态的信息架构和视觉层级。
- 明确哪些线条、分隔、卡片、留白和模块边界应该减少或统一。
- 用 Tailwind CSS v4 建立可执行的视觉规则：容器宽度、排版尺度、间距、颜色、分隔线、卡片/列表样式、移动端断点。
- 产出可人工审核的视觉方案、验收标准和实施计划；确认后再开发。

## 非目标

- 本轮规划阶段不写业务代码。
- 不修改 Admin、API、数据库、infra、docs/product。
- 不做品牌重命名，不引入复杂动效，不做营销落地页。
- 不以增加装饰为目标，优先减少混乱、增强内容可读性。

## 初始需求

- C 端布局内容太乱，需要更专业地调整。
- 区块线条之间杂乱，需要统一或减少。
- 希望引用前端网站设计相关 skill 支撑方案。
- 先聚焦方案，不直接进入开发。

## 验收标准

- [ ] `artifacts/requirement.md` 明确 C 端核心问题、目标页面、视觉验收标准和非目标。
- [ ] `artifacts/architecture.md` 明确视觉信息架构、页面结构、Tailwind 设计规则和风险。
- [ ] `artifacts/implementation-plan.md` 明确开发顺序、文件范围、测试/截图验收和回滚方式。
- [ ] 方案明确引用哪些 skill 候选，以及它们在本轮中支撑哪些判断。
- [ ] 规划阶段不修改 `apps/`、不写 `docs/product/`。

## 影响范围

- [x] web
- [ ] admin
- [ ] api
- [ ] db
- [ ] infra
- [x] docs

## 测试要求

- 规划阶段运行 harness 结构检查。
- 后续开发阶段必须包含桌面与移动端截图验收、首页/列表/详情/404 空态检查、无横向滚动和无文字遮挡验证。

## 回滚方式

- 规划阶段仅写入 `.harness/backlog/ready/` 与 `.harness/runs/<run>/artifacts/`。
- 开发阶段若视觉改造不满意，应能按页面或 CSS 层级回滚。
