# 主 agent 汇总

## Run 信息

- runId: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做
- workflow_profile: full
- impact_scopes: admin, web

## 主 agent 模型

- profile: low_cost
- model: gpt-5.4-mini
- reasoning_effort: low

## 已生成任务

- tasks/pm.task.md
- tasks/requirements.task.md
- tasks/architect.task.md
- tasks/frontend.task.md
- tasks/database.task.md
- tasks/tester.task.md
- tasks/reviewer.task.md
- tasks/release.task.md

## 执行说明

- 创建或选择 run 前先使用 intake 判断。
- 需求仍粗糙时，先运行 requirements-plan，再进入实现。
- 当生命周期工具可用时，使用 native subagents。
- 用户确认前，规划产物必须保留在 run artifacts 内。
- 产品文档同步只能在 release 后，并且获得明确确认后执行。
