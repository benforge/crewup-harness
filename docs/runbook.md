# CrewUp Runbook

[English](./runbook.en.md) | 中文

这份 runbook 用来判断一个 CrewUp run 是否正常、是否完成、卡住时怎么处理。它面向真实使用者，不要求用户理解所有内部脚本。

命令分层、哪些命令日常不用、以及 `lite` / `strict` / `plan` / `discovery` 的完整完成态定义，以 [命令与完成态治理](./command-governance.md) 为准。

## 先看哪里

每个正式工作都对应一个 run：

```text
.harness/runs/<run-id>/
```

优先看这些文件：

| 文件 | 用途 |
| --- | --- |
| `RUN_STATUS.md` | 当前状态、阶段、owner、下一步、阻塞和进度 |
| `GOAL.md` | 本次迭代目标、成功标准、非目标和返工预算 |
| `completion-contract.json` | 机器可读完成契约，gate/status/report 用它判断结论 |
| `RUN_SUMMARY.md` | 归档后的摘要，可用于后续 run 继续 |
| `logs/run-report.md` | 当前 run 的交付报告 |
| `logs/repair-plan.md` | tester/reviewer 要求修复时的 owner 修复计划 |
| `artifacts/preview-smoke.md` | Web/full-stack run 的预览 URL 验证证据 |
| `logs/archive/archive-summary.md` | 归档原因和结果 |

排查和收口时常用命令：

```bash
npx crewup status
npx crewup status <run-id>
npx crewup explain <run-id>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup preview-smoke <run-id> --url=http://localhost:3000
npx crewup report <run-id>
```

`crewup explain <run-id>` 是排查入口：不知道完成没有、不知道为什么卡住、不知道下一步做什么时，先跑它。

## 正常流程是什么

标准顺序：

```text
requirements-plan
  -> requirements
  -> architect
  -> implementation agents assigned by implementation-plan.md
  -> tester
  -> reviewer
  -> release
```

健康 run 应满足：

- `RUN_STATUS.md` 存在，并显示 status、stage、owner、next command。
- `GOAL.md` 和 `completion-contract.json` 存在，用来定义这次怎样才算成功。
- `requirements-plan` 先负责澄清和需求确认。
- `requirements` 必须等 `requirements-plan` 完成并登记结果后才能启动。
- `architect` 必须等 `requirements` 完成并登记结果后才能启动。
- 实现类 agent 只有被 `implementation-plan.md` 明确分配后才能启动。
- tester/reviewer 的必修反馈必须回到 owner implementation agent。
- 主 agent 只创建 run、调用 `next-agent`、调度子 agent、登记结果、跑 audit/gate/report/archive、汇报路径和状态。
- 主 agent 不代写 `requirement-plan.md`、`requirement.md`、`architecture.md`、`implementation-plan.md`、测试报告、评审报告或业务代码。

## 什么是不正常

看到这些情况，应先修流程，不要继续往下开发：

- `requirements` 和 `architect` 并行启动。
- 没有 `requirements-plan` 就直接启动开发 agent。
- 缺少 `implementation-plan.md` 却启动 frontend/backend/database/devops/docs。
- tester/reviewer 反馈后，主 agent 直接修改业务代码。
- 主 agent 把子 agent 长结果复制进 owner artifact。
- 子 agent 写了 result 文件，但没有登记到 native-state。
- `RUN_STATUS.md` 没有清楚下一步。
- 聊天窗口贴满完整日志、完整 context pack 或完整子 agent 对话。
- 用户项目的业务 run 修改了 `.harness/scripts/**`、`.harness/config/**`、`.harness/orchestrator/**`、`.harness/agents/**` 等 core 文件。
- `npx crewup check` 提示 sealed core drift。

如果业务 run 暴露的是 CrewUp 产品自身 bug，应把当前 run 标记为 open blocked/partial，然后回到 CrewUp 源码仓库单独修复、测试、发版。不要在用户项目的业务 run 里顺手修 `.harness` 核心脚本。

## 怎么算完成

先看 `RUN_STATUS.md` 顶部的 `迭代结论`：

| 结论 | 含义 | 是否完整成功 |
| --- | --- | --- |
| `SUCCESS` | `status=done`、`outcome=success`、`archived=true`，并有 gate/report/archive 证据 | 是 |
| `READY_TO_ARCHIVE` | 已 done/success，但还没有归档收口 | 否 |
| `PARTIAL` | 部分完成，或存在绕过严格 owner-agent 流程的直接会话变更 | 否 |
| `BLOCKED` | 被环境、依赖、工具、子 agent 或流程问题阻塞 | 否 |
| `FAILED` | 失败，不能作为交付结果使用 | 否 |
| `CANCELED` | 主动取消 | 否 |
| `IN_PROGRESS` / `WAITING_USER` | 仍在进行或等待用户确认 | 否 |

成功完成必须同时满足：

- 满足 `GOAL.md` / `completion-contract.json` 的成功标准。
- `state.status=done`。
- `outcome=success`。
- owner artifacts 由对应 owner agent 产出。
- tester/reviewer 问题已处理或明确关闭。
- `audit` 和 `gate-check` 通过。
- `report` 已生成。
- Web/full-stack run 已给出预览 URL；如果启动过预览服务，`preview-smoke` 通过或记录了明确阻塞原因。
- 如启动过 dev service，已停止或记录关闭状态。
- `RUN_STATUS.md` 显示成功并已归档。

推荐收口命令：

```bash
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup preview-smoke <run-id> --url=<preview-url>
npx crewup report <run-id>
npx crewup finish <run-id>
```

`finish` 是成功收口路径。单纯 archive 不代表成功，只有 `outcome=success` 才是成功结局。

## 卡住怎么办

先不要让主 agent 猜，按顺序运行：

```bash
npx crewup explain <run-id>
npx crewup native-state <run-id> diagnose
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

常见情况：

| 情况 | 处理 |
| --- | --- |
| 不知道 run 到哪了或为什么卡住 | 先运行 `npx crewup explain <run-id>`，按 `Next Steps` 做 |
| 等待用户确认 | `npx crewup clarify <run-id> --interactive` |
| 子 agent 没有结果 | 恢复对应 agent 做 result-only closeout |
| result 文件存在但没登记 | 运行 `native-state reconcile-results` 后再看 `next-agent` |
| `next-agent` 是 `action=wait` | 等 active agent 写入 result；这不是用户决策点 |
| `next-agent` 是 `action=repair` | 运行 `repair-plan`，把修复派回 owner agent |
| `next-agent` 是 `action=done` 或 `closed` | run 已收尾或关闭，不要继续启动 agent |
| tester/reviewer 写了非法 `status=fix-required` | 改为 `status=completed` + `fixRequired=true`，再刷新 repair-plan |
| owner artifact 不合格 | 恢复 owner agent 修复，不让主 agent 代写 |
| repair 轮次超过预算 | 保持 open blocked/partial，让用户决定继续、缩小范围或显式关闭 |
| 预览 URL 或 smoke 失败 | 在当前 run 内回到 owner agent 修复，不让主 agent 直接改业务代码 |
| 本地依赖/环境不可用 | 记录 blocker，默认保持 run open；用户明确放弃时再 close |
| sealed core drift | `npx crewup install --force` 恢复，或回 CrewUp 源码仓库修产品 bug |

## blocked、partial、canceled 怎么收口

阻塞不等于归档。实现、测试、评审、预览或发布阶段遇到问题时，默认保持当前 run open，并继续指向 owner agent。

只有用户明确表示放弃、关闭、接受部分完成或保存失败现场时，才关闭非成功 run：

```bash
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable" --close
npx crewup archive <run-id> --outcome=partial --reason="frontend done, backend blocked" --close
npx crewup archive <run-id> --outcome=failed --reason="tests cannot run in this environment" --close
npx crewup cancel <run-id> --reason="scope changed"
```

不加 `--close` 时，`archive --outcome=blocked|partial|failed` 只更新状态和报告，不会把 run 归档关闭。

关闭后会生成：

- `RUN_SUMMARY.md`
- `logs/archive/archive-summary.md`
- `.harness/reports/<run-id>.md`

## 什么时候继续旧 run，什么时候新开 continuation

如果 run 仍是 open blocked/open partial，优先在当前 run 内继续：

```bash
npx crewup explain <run-id>
npx crewup next-agent <run-id>
```

如果旧版本或人工操作把本应继续修复的 blocked run 误关闭，可以显式重开：

```bash
npx crewup native-state <run-id> reconcile-results
npx crewup repair-state <run-id> --reopen-blocked --apply
npx crewup report <run-id>
npx crewup next-agent <run-id>
```

如果一个 run 已经归档关闭，后续再发现 UI、预览、部署、登录或功能问题，应创建 continuation run：

```bash
npx crewup continue <source-run-id> "修复归档后发现的问题"
```

新 run 会复用来源 run 的状态卡、摘要、需求、架构和实现计划。旧 run 不会被覆盖。

## 主 agent 汇报标准

主 agent 给用户汇报时应保持短：

```text
Run: <run-id>
Status: active / requirements_plan
Verdict: IN_PROGRESS
Owner: requirements-plan
Next: npx crewup next-agent <run-id>
Why: <one-line explanation from crewup explain>
Status card: .harness/runs/<run-id>/RUN_STATUS.md
Details: .harness/runs/<run-id>/logs/run-report.md
```

不要粘贴完整子 agent 输出、完整日志、完整 context pack 或多个候选下一步。需要细节时给路径。

## Lite 收口规则

`lite` run 的 `finish` 不走 strict native subagent gates，而是检查轻量证据文件：

- `spec.md`
- `tasks.md`
- `validation.md`
- `summary.md`

其中 `validation.md` 和 `summary.md` 必须从 pending 模板状态更新为真实验证和结果记录。如果仍是 pending，`finish` 会失败并保持 run open。

详细说明见 [Lite 轻量流程](./lite-v2.md)。
