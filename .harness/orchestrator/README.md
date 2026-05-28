# 方案 A：Codex 会话内半自动编排

本目录定义默认工作方式：**Codex 当前会话担任 main agent，优先使用 native subagents；desktop prompts 和 API orchestrate 只是降级路径**。

## 它能做到什么

- 你用中文描述需求。
- 主 agent 把需求整理成 ready 任务。
- 主 agent 创建 run。
- 主 agent 根据影响范围生成多个 `tasks/*.task.md`。
- 每个 task 会带上推荐模型和推理强度。
- 主 agent 按任务文件切换角色执行，必要时可在支持的环境里委派子 agent。
- PM / Requirements / Architect 先完成需求、验收标准、设计方案和实施计划，并交给你审核。
- 你确认继续后，主 agent 再启动开发、测试、评审和 release。
- 通过 `harness:native-plan` 生成 native subagent 执行计划，并由 main agent 调用 `spawn_agent` / `wait_agent` / `close_agent` 执行真实多 agent 生命周期。
- 主 agent 收集 artifacts、测试结果、评审结果，再给你最终反馈。

## 它不做什么

- 不保证所有环境都支持对每个子 agent 指定不同模型。
- v1 不允许子 agent 直接随意改业务代码，只允许写 run 日志和 artifact 更新建议。
- 不绕过人工确认做破坏性数据库操作。
- 不在规划阶段把设计方案或实施路线图直接写入 `docs/product/`。
- 不自动读取或使用你的密钥。
- 不自动部署生产环境。

## 标准入口

当你说：

```text
按 harness 流程处理这个需求：……
```

主 agent 应执行：

1. 执行 `npm run harness:intake -- --text="<用户需求>"` 形成入口决策。
2. 需要开工时，先创建 `.harness/backlog/ready/*.md`，再执行 `npm run harness:new-run -- <ready文件名>`。
3. 需求粗略时，执行 `npm run harness:requirements-plan -- <run-id>`，并在用户确认后 `--promote`。
4. 执行 `npm run harness:transition -- <run-id> --to=plan`。
5. 执行 `npm run harness:prepare-run -- <run-id>`。
6. 执行 `npm run harness:context-pack -- <run-id> --agents=<agents>`。
7. 执行 `npm run harness:native-plan -- <run-id> --agents=<agents>`，再由 main agent 启动 native subagents。
8. 规划完成后汇总给用户审核；用户确认后执行 `npm run harness:transition -- <run-id> --to=implement --approve-implementation`。
9. 开发完成后进入 verify、review、release，每阶段用 `harness:transition` 推进。
10. 执行 `npm run harness:verify -- <run-id>`、`npm run harness:gate-check -- <run-id>`、`npm run harness:report -- <run-id>`。
11. 用户确认完成/归档后，执行 `npm run harness:transition -- <run-id> --to=done`；该步骤会自动记录 product sync 确认并同步 `docs/product/runs/`、weekly、monthly、yearly。
12. 如需单独重跑产品文档同步，可执行 `npm run harness:product-sync -- <run-id> --approved-product-sync`。
13. 汇总结果给用户。

## 真实多 agent v1

预览执行计划：

```bash
npm run harness:orchestrate -- 2026-05-14-001-blog-mvp --dry-run
```

真实执行需要 `OPENAI_API_KEY`：

```bash
$env:OPENAI_API_KEY="你的 key"
npm run harness:orchestrate -- 2026-05-14-001-blog-mvp
```

允许开发类 agent 写业务代码：

```bash
npm run harness:orchestrate -- 2026-05-14-001-blog-mvp --apply-code
```

写代码受 `.harness/config/write-policy.yaml` 约束。只有 `frontend`、`backend`、`database`、`devops`、`tester` 可以写，且只能写入各自 task 的 `允许修改` 范围；`.harness/`、`.git/`、`node_modules/`、`.env*` 等路径会被拒绝。

高风险写入需要额外审批：

```bash
npm run harness:orchestrate -- 2026-05-14-001-blog-mvp --apply-code --approve-risk
```

风险规则在 `.harness/config/risk-policy.yaml`。写入前会备份已有文件，写入审计记录保存在 `logs/agents/*.code-writes.json`。

执行结果会写入：

```text
.harness/runs/<run-id>/logs/agents/
.harness/runs/<run-id>/logs/main-agent-summary.md
.harness/runs/<run-id>/logs/orchestrate-results.json
```
