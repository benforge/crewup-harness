# CrewUp Runbook

[English](./runbook.en.md) | 中文

这份 runbook 用来判断一个 CrewUp run 是否正常、是否完成、卡住时怎么收口。它面向真实使用者，不要求用户理解所有内部脚本。

## 先看哪里

每个正式工作都对应一个 run：

```text
.harness/runs/<run-id>/
```

优先看这些文件：

| 文件 | 用途 |
| --- | --- |
| `RUN_STATUS.md` | 当前状态、owner、下一步、阻塞、进度 |
| `RUN_SUMMARY.md` | 归档后的摘要，可用于后续 run 继续 |
| `logs/run-report.md` | 当前 run 的交付报告 |
| `.harness/reports/<run-id>.md` | 全局报告副本 |
| `logs/archive/archive-summary.md` | 归档原因和结局 |
| `logs/archive/git-commit.md` | 归档提交审计；没有初始 commit 时会记录 skipped |

常用命令：

```bash
npx crewup status
npx crewup status <run-id>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

## 什么算正常

正常 run 应满足：

- `RUN_STATUS.md` 存在，并能看到 status、stage、owner、next command。
- 如果当前目录是 Git 仓库，run 会尝试创建 `crewup/<run-id>-<slug>` 分支；创建前已有未提交文件会记录到 `state.json` 的 `git.dirtyAtStart`。
- 安装后的 `.harness/core-lock.json` 存在，`npx crewup check` 能验证 sealed core 没有漂移。
- 初始 `next-agent` 只允许 `requirements-plan` 启动。
- `requirements` 等 `requirements-plan` 完成后才启动。
- `architect` 等 `requirements` 完成后才启动。
- 实现类 agent 只是候选，只有 `implementation-plan.md` 精确分配后才启动。
- tester/reviewer 的 required fixes 回派给 owner implementation agent。
- 主 agent 只创建 run、调用 `next-agent`、登记结果、跑 audit/gate/report，不代写 owner artifact 或业务代码。

正常顺序：

```text
requirements-plan
  -> requirements
  -> architect
  -> implementation agents assigned by implementation-plan.md
  -> tester
  -> reviewer
  -> release
```

## 什么不正常

看到这些情况，应暂停继续开发并先修流程：

- `requirements` 和 `architect` 并行启动。
- 没有 `requirements-plan` 就直接启动开发 agent。
- 缺少 `implementation-plan.md` 却启动了 frontend/backend/database/devops/docs。
- tester/reviewer 反馈后，主 agent 直接修改业务代码。
- 主 agent 把子 agent 长结果复制进 `requirement.md`、`architecture.md`、`test-report.md` 等 owner artifact。
- 子 agent 结果没有登记到 native-state 或 bridge result JSON。
- `RUN_STATUS.md` 没有下一步，用户不知道继续做什么。
- 聊天窗口堆满完整日志、完整 context pack 或完整子 agent 对话。
- 当前业务 run 修改了 `.harness/scripts/**`、`.harness/config/**`、`.harness/orchestrator/**`、`.harness/agents/**` 等 harness core 文件。
- `npx crewup check` 提示 sealed core drift。

如果业务 run 暴露了 harness 自身 bug，应把当前 run 标记为 `blocked` 或 `partial`，然后在 CrewUp 源码仓库单独开维护任务。不要在同一个项目功能 run 里顺手修 `.harness` 核心脚本。

## 什么算完成

成功完成必须同时满足：

- `state.status` 是 `done`。
- `outcome` 是 `success`。
- owner artifacts 由对应 agent 产出。
- tester/reviewer 问题已处理或明确关闭。
- `audit` 和 `gate-check` 通过。
- `report` 已生成。
- 如果启动过 dev service，已停止或记录关闭状态。
- `RUN_STATUS.md` 显示 done，并且有 report/archive 证据。

推荐命令：

```bash
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
npx crewup finish <run-id>
```

`finish` 表示成功收口。归档不一定表示成功，只有 `outcome=success` 才是成功结局。

## 卡住怎么办

先判断卡在哪里：

```bash
npx crewup status <run-id>
npx crewup native-state <run-id> diagnose
npx crewup audit <run-id>
```

常见处理：

| 情况 | 处理 |
| --- | --- |
| 等用户确认 | `npx crewup clarify <run-id> --interactive` |
| 子 agent 没结果 | 恢复对应 agent，或在 bridge/manual 模式写回 result JSON |
| 结果文件存在但没登记 | `npx crewup native-state <run-id> diagnose` 会提示 `mark-result` |
| 子 agent 运行太久没捕获结果 | 要求同一个子 agent 做 result-only closeout，不让主 agent 代写 |
| owner artifact 不合格 | 恢复 owner agent 修复，不让主 agent 代写 |
| tester/reviewer 要求修复 | `repair-plan` 分配给 owner implementation agent |
| 本地依赖/环境不可用 | 记录 blocker，必要时归档为 `blocked` |
| 只完成一部分 | 归档为 `partial`，并在下一个 run 继续 |
| sealed core 漂移 | `npx crewup install --force` 恢复，或在 CrewUp 源码仓库修复产品问题 |

## 取消、失败、部分完成

不要让 run 永远悬空。非成功结局也要收口：

```bash
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable"
npx crewup archive <run-id> --outcome=partial --reason="frontend done, backend blocked"
npx crewup archive <run-id> --outcome=failed --reason="tests cannot run in this environment"
npx crewup cancel <run-id> --reason="scope changed"
```

归档会生成：

- `RUN_SUMMARY.md`
- `logs/archive/archive-summary.md`
- `.harness/reports/<run-id>.md`

这能让下一次 run 复用现场，而不是依赖聊天记忆。

## Git 和归档提交

真实项目建议先创建初始提交：

```bash
git add -A
git commit -m "chore: initial setup"
```

如果仓库没有初始 commit，CrewUp 的 archive commit 会写入 `logs/archive/git-commit.md`，状态为 `skipped`，原因是 `repository has no initial git commit`。这不会把已经成功的 run 判为失败。

如果工作区有本次 run 之外的新变更，archive commit 会阻塞，要求先记录 changed-files 或显式使用 `--allow-all-workspace-changes`。

## 继续上一轮 Run

如果一个 run 被 `blocked`、`partial`、`canceled` 或 `failed`，但后续要继续：

```bash
npx crewup continue <source-run-id> "继续处理上次未完成的问题，复用已有需求和架构"
```

新的 run 会读取来源 run 的：

- `RUN_STATUS.md`
- `RUN_SUMMARY.md`
- `artifacts/requirement.md`
- `artifacts/architecture.md`
- `artifacts/implementation-plan.md`

旧 run 不会被覆盖，新 run 是新的正式工作单元。

## 主 Agent 汇报标准

主 agent 给用户汇报时应保持短：

```text
Run: <run-id>
Status: active / requirements_plan
Owner: requirements-plan
Next: npx crewup next-agent <run-id>
Status card: .harness/runs/<run-id>/RUN_STATUS.md
Details: .harness/runs/<run-id>/logs/run-report.md
```

不要粘贴完整子 agent 输出、完整日志、完整 context pack。需要细节时给路径。

常规进度更新控制在六行以内。不要输出实现推理、完整 artifact 段落、native-state JSON 或多个候选下一步。若看起来有多个选择，先运行 `next-agent`，只汇报当前被授权的下一步。
