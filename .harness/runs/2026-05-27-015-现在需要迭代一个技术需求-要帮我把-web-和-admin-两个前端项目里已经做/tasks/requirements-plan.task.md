# 原生子 agent 任务：requirements-plan

## Run 信息

- runId: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做
- agent: requirements-plan
- stage: intake-plan

## 推荐模型

- profile: requirements_planning
- mode: plan_only
- agent_type: explorer

## 输入

- .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/input.md
- .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/artifacts/requirement-interview.md
- .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/artifacts/requirement-plan.md
- .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/context/related-runs.md
- .harness/agents/requirements.md
- .harness/config/requirements-planning.yaml
- .harness/config/model-policy.yaml

## 职责范围

使用 plan-only 需求分析，把用户原始想法扩写为清晰、可评审的需求草案。不要写业务代码，不要做架构决策，不要启动实现工作。

## 允许修改范围

- .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/artifacts/requirement-plan.md

## 禁止事项

- 业务代码变更
- 应由 architect 负责的架构决策
- 实现任务执行
- 未经用户在 release 后明确要求时写入 docs/product/**

## 必须包含章节

- 需求背景
- 目标
- 非目标
- 用户角色与权限
- 核心用户流程
- 页面与路由候选
- 数据与接口线索
- 验收标准
- 风险与边界
- 待确认问题

## 用户原始需求

# 现在需要迭代一个技术需求，要帮我把 web 和 admin 两个前端项目里已经做

- backlogId: 015
- createdAt: 2026-05-27T10:31:09.319Z
- queue: ready
- intake_policy: .harness/config/intake-policy.yaml

## 原始需求

现在需要迭代一个技术需求，要帮我把 web 和 admin 两个前端项目里已经做好的页面逐步迁移为 Tailwind 优先写法。说明：web 继续以 Tailwind 为主要样式方式；admin 保留 Ant Design 作为组件层，但页面布局、间距、宽度、对齐、响应式和外层视觉尽量用 Tailwind；现有自定义 CSS 尽量逐步替换成 Tailwind utility class；后续新增页面也默认优先用 Tailwind；不要改业务逻辑，只做样式迁移和相关规则调整

## 完成检查清单

- [ ] 已把原始需求扩写为具体目标和非目标
- [ ] 当需求模糊或已有交互回答时，已使用 requirement-interview.md
- [ ] 已把验收标准写成可检查的陈述
- [ ] 已列出待确认问题，而不是编造不确定事实
- [ ] 已标记候选影响范围
- [ ] 输出只保留在 artifacts/requirement-plan.md
