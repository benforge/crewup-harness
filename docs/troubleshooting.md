# CrewUp 故障排查

中文 | [English](./troubleshooting.en.md)

这份文档只回答一件事：当一个 CrewUp run 看起来卡住、混乱、无法判断是否完成时，应该看哪里、跑什么命令、下一步怎么安全处理。

## 先跑 explain

如果你不知道当前 run 到底是成功、阻塞、等待用户、等待子 agent，还是已经关闭，先运行：

```bash
npx crewup explain <run-id>
```

它会输出：

- 当前结论：`SUCCESS`、`IN_PROGRESS`、`WAITING_USER`、`WAITING_AGENT`、`NEEDS_REPAIR`、`BLOCKED`、`PARTIAL`、`FAILED`、`CANCELED`
- 当前状态：status、stage、outcome、archived
- 是否还有可调度 agent
- 是否需要 owner agent 修复
- gate/native-state 诊断问题
- 下一步只应该做什么

主 agent 回答“这个 run 完成了吗 / 为什么卡住 / 下一步做什么”时，也应该先跑这个命令，不能只靠聊天记忆判断。

## 中文乱码

CrewUp 文件统一用 UTF-8 读写。若你在 PowerShell、cmd、远程终端或旧终端里看到中文乱码，通常是终端显示编码问题，不一定是文件损坏。

先用 Node 按 UTF-8 读取验证：

```bash
node -e "console.log(require('fs').readFileSync(process.argv[1], 'utf8'))" .harness/runs/<run-id>/RUN_STATUS.md
```

如果 Node 输出正常，但 PowerShell/cmd 输出乱码，问题在终端显示层。

Windows 临时设置：

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

也可以查看内置建议：

```bash
npx crewup doctor --encoding-help
npx crewup doctor --encoding-profile
```

推荐 Windows Terminal + PowerShell 7。macOS/Linux 通常默认就是 UTF-8，可用 `locale` 检查。

## 子 agent 没有继续

先运行：

```bash
npx crewup explain <run-id>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
```

常见原因：

- 上游 agent 没有真实 handle/result
- result 文件存在，但没有被 `mark-result` 或 `reconcile-results` 登记
- 当前有 agent 正在运行，`next-agent` 返回 `action=wait`
- tester/reviewer 要求修复，`next-agent` 返回 `action=repair`
- bridge/manual 模式没有写回 result JSON
- API key 或外部 agent 登录状态不可用

如果诊断提示某个 agent 运行太久但没有结果，应该恢复同一个子 agent 做 result-only closeout。不要让主 agent 代写 owner artifact 或业务代码。

## tester/reviewer 要求修复

tester/reviewer 发现问题时，正确路径是回到 owner agent，不是让主 agent 直接改文件。

推荐顺序：

```bash
npx crewup native-state <run-id> reconcile-results
npx crewup repair-plan <run-id> --refresh
npx crewup next-agent <run-id>
```

合法 result status 只有：

```text
completed
blocked
needs_input
```

如果 tester/reviewer 有必修项，应使用：

```json
{
  "status": "completed",
  "fixRequired": true,
  "targetAgents": ["frontend"],
  "requiredFixes": []
}
```

不要写 `status=fix-required`。

## 已关闭 run 不应继续

如果 `crewup explain <run-id>` 或 `next-agent` 显示：

```text
action=done
action=closed
```

说明这个 run 已经完成、取消、失败或归档关闭。不要继续启动子 agent。

后续发现 UI、预览、部署、登录或功能问题时，应创建 continuation run：

```bash
npx crewup continue <run-id> "修复归档后发现的问题"
```

## blocked 不等于结束

阻塞默认应该保持 run open，并继续在当前 run 内修复：

```bash
npx crewup explain <run-id>
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

只有用户明确表示放弃、关闭、接受部分结果或保存失败现场时，才关闭非成功 run：

```bash
npx crewup archive <run-id> --outcome=blocked --reason="..." --close
npx crewup archive <run-id> --outcome=partial --reason="..." --close
npx crewup cancel <run-id> --reason="scope changed"
```

## 用户项目里的 .harness 被修改

业务 run 不应该修改 harness core：

```text
.harness/scripts/**
.harness/config/**
.harness/orchestrator/**
.harness/agents/**
.harness/templates/**
.harness/contracts/**
.harness/rules/**
```

如果 `npx crewup check` 提示 sealed core drift：

```bash
npx crewup install --force
npx crewup check
```

如果这是 CrewUp 产品自身 bug，应回到 CrewUp 源码仓库修复、测试、发版，而不是在用户项目的业务 run 里顺手修 `.harness`。

## Lite 排查

`lite` 默认不使用 native subagents。如果 `lite` run 看起来卡住，先检查：

```text
.harness/runs/<run-id>/spec.md
.harness/runs/<run-id>/tasks.md
.harness/runs/<run-id>/validation.md
.harness/runs/<run-id>/summary.md
```

常见情况：

| 现象 | 处理 |
| --- | --- |
| `finish` 提示 `update validation.md, summary.md` | 把 pending 模板内容替换成验证发现依据、真实执行结果和总结 |
| 没有 native subagent plan | 这是 `lite` 的预期行为；需要审计时改用 strict |
| 任务执行中发现高风险范围 | 停止 `lite`，记录原因，重新创建 strict 或 `strict --risk=high` run |

strict 下如果 `next-agent` 返回 `action=stale`，说明 active native subagent 长时间没有 result 或 progress checkpoint。默认阈值来自 `.harness/config/native-subagents.yaml` 的 `runtime.slow_result_capture_minutes`。先要求同一个子 agent 做一次 result-only closeout；仍无结果时再诊断或记录 blocked，不要无限等待。

详细说明见 [Lite 轻量流程](./lite-v2.md)。
