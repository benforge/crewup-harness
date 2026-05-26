# 原生子 agent 计划：2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改

- mode: codex_spawn_agent
- max_parallel_subagents: 4

## 执行组

### implementation

- parallel: true
- frontend

### verification

- parallel: false
- reviewer

## 启动任务

### frontend
- spawn_name: 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改:frontend
- agent_type: worker
- wait_group: implementation
- context_mode: full
- reasons: task mentions high-risk keyword: 生产
- prompt: .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/logs/native-subagents/frontend.spawn.md
- result: .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/logs/native-subagents/frontend.result.md
- close_required: true
- retain_after_result: true
- write_owner: true

### reviewer
- spawn_name: 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改:reviewer
- agent_type: explorer
- wait_group: verification
- context_mode: full
- reasons: task mentions high-risk keyword: security
- prompt: .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/logs/native-subagents/reviewer.spawn.md
- result: .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/logs/native-subagents/reviewer.result.md
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

