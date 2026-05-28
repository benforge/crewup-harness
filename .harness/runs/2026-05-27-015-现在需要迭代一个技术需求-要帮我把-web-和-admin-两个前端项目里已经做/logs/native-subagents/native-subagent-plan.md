# 原生子 agent 计划：2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做

- mode: codex_spawn_agent
- max_parallel_subagents: 4
- critical verification order: tester -> reviewer -> release
- do not spawn reviewer before tester completes; do not spawn release before reviewer completes

## 执行组

### intake

- parallel: false
- pm
- requirements-plan
- requirements
- architect

### implementation

- parallel: true
- frontend
- database

### verification_tester

- parallel: false
- tester

### verification_reviewer

- parallel: false
- reviewer

### verification_release

- parallel: false
- release

## 启动任务

### pm
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:pm
- agent_type: explorer
- wait_group: intake
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/pm.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/pm.result.md
- close_required: true
- retain_after_result: true
- write_owner: false

### requirements-plan
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:requirements-plan
- agent_type: explorer
- wait_group: intake
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/requirements-plan.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/requirements-plan.result.md
- close_required: true
- retain_after_result: true
- write_owner: false

### requirements
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:requirements
- agent_type: explorer
- wait_group: intake
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/requirements.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/requirements.result.md
- close_required: true
- retain_after_result: true
- write_owner: false

### architect
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:architect
- agent_type: explorer
- wait_group: intake
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/architect.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/architect.result.md
- close_required: true
- retain_after_result: true
- write_owner: false

### frontend
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:frontend
- agent_type: worker
- wait_group: implementation
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/frontend.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/frontend.result.md
- close_required: true
- retain_after_result: true
- write_owner: true

### database
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:database
- agent_type: worker
- wait_group: implementation
- context_mode: full
- reasons: role database requires full context; task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/database.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/database.result.md
- close_required: true
- retain_after_result: true
- write_owner: true

### tester
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:tester
- agent_type: worker
- wait_group: verification_tester
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/tester.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/tester.result.md
- close_required: true
- retain_after_result: true
- write_owner: true

### reviewer
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:reviewer
- agent_type: explorer
- wait_group: verification_reviewer
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/reviewer.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/reviewer.result.md
- close_required: true
- retain_after_result: true
- write_owner: false

### release
- spawn_name: 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做:release
- agent_type: explorer
- wait_group: verification_release
- context_mode: full
- reasons: task mentions high-risk keyword: 迁移
- prompt: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/release.spawn.md
- result: .harness/runs/2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做/logs/native-subagents/release.result.md
- close_required: true
- retain_after_result: true
- write_owner: false

## 生命周期检查清单

- 只启动可以和主 agent 工作并行的非阻塞任务。
- 当下一步关键路径需要结果时再等待对应 agent。
- 将结果保存或摘要到 `logs/native-subagents/`。
- agent 完成后先保留在 `waiting_review`，同时遵守保留容量限制。
- 当可用名额紧张时，先运行 `harness:native-state -- <run-id> recommend-close` 再启动更多 agent。
- 对已保留的 agent，优先使用 `send_input`/`resume_agent`，不要直接重复启动替代 agent。
- 只有在结果已捕获且状态为 `ready_to_close` 后，才关闭 agent。

