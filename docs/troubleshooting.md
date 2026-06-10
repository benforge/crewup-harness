# CrewUp 故障排查

中文 | [English](./troubleshooting.en.md)

## 终端中文乱码

CrewUp 文件统一按 UTF-8 读写。如果你在 PowerShell、cmd、某些远程终端或旧终端里看到中文变成乱码，通常是终端显示编码问题，不代表文件损坏。

典型现象：中文在终端里变成不可读字符，但用 VS Code、Notepad++ 或其他 UTF-8 编辑器打开文件是正常的。

## 先判断文件是否真的损坏

用 Node 按 UTF-8 读取：

```bash
node -e "console.log(require('fs').readFileSync(process.argv[1], 'utf8'))" .harness/runs/<run-id>/artifacts/requirement-plan.md
```

如果 Node 输出正常，而 PowerShell/cmd 输出乱码，问题在终端显示层。

## Windows 推荐设置

先运行：

```bash
npx crewup doctor
npx crewup doctor --encoding-help
```

当前终端临时切换 UTF-8：

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

长期生效可以把以下内容放进 PowerShell profile：

```powershell
notepad $PROFILE
```

```powershell
chcp 65001 > $null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

推荐使用 PowerShell 7 + Windows Terminal。

## macOS / Linux 推荐设置

大多数现代终端默认就是 UTF-8。检查：

```bash
locale
```

如果不是 UTF-8，在 shell profile 中设置：

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

## CrewUp 的处理原则

- 文件和 artifacts 始终按 UTF-8 写入。
- 机器契约、JSON key、状态值、命令和路径保持英文。
- CLI 尽量输出短状态和文件路径。
- 大段中文内容优先写入 Markdown 文件，建议用编辑器打开。
- `doctor` 负责提示终端编码问题，但不会自动修改用户系统配置。

## 子 agent 没有继续

先看：

```bash
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
```

常见原因：

- 当前 agent 不是 runnable。
- 上游 agent 没有真实 handle/result。
- result 文件存在但没有 `mark-result`。
- native 工具不可用。
- bridge/manual 模式没有写回 result JSON。
- API key 或外部 agent 登录状态未配置。

如果诊断提示某个 agent 运行过久但没有捕获结果，应恢复同一个子 agent 做 result-only closeout，不要让主 agent 代写。

## Run 已经成功归档，但 next-agent 还像能继续

以 `npx crewup status <run-id>` 和 `npx crewup gate-check <run-id>` 为准：

```bash
npx crewup status <run-id>
npx crewup gate-check <run-id>
```

如果状态是 `done / success / archived` 且 gate 通过，这个 run 已经收尾。不要继续启动子 agent；后续新需求或归档后发现的问题应创建 continuation run。

CrewUp 0.3.20 起，`next-agent` 对已关闭或已归档 run 会返回 `action=done|closed`、`next=null`、`runnable=[]`，避免主 agent 误继续旧 run。

## result 文件已更新，但流程仍卡在旧 repair-plan

这通常是子 agent 覆盖了自己的 `*.result.json`，但 native-state 捕获时间还是旧的。处理顺序：

```bash
npx crewup native-state <run-id> diagnose
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

如果仍然卡住，要求对应 owner agent 做 result-only closeout，然后重新运行：

```bash
npx crewup native-state <run-id> mark-result <agent> completed .harness/runs/<run-id>/logs/native-subagents/<agent>.result.md
npx crewup next-agent <run-id>
```

不要让主 agent 手写 owner artifact 或业务代码。CrewUp 0.3.20 起，同一路径 result 文件被更新后，`mark-result` / `reconcile-results` 会刷新捕获时间，避免 repair-plan 时间线卡死。

## tester/reviewer 写了不合法 status

合法 result status 只有：

```text
completed
blocked
needs_input
```

如果 tester/reviewer 发现需要修复，不要写 `fix-required`。正确写法是：

```json
{
  "status": "completed",
  "fixRequired": true,
  "targetAgents": ["frontend"],
  "requiredFixes": []
}
```

然后运行：

```bash
npx crewup native-state <run-id> mark-result tester completed
npx crewup repair-plan <run-id> --refresh
npx crewup next-agent <run-id>
```

## 主 agent 修改了业务代码

正式 CrewUp run 中这不应该发生。处理方式：

1. 运行 `npx crewup audit <run-id>`。
2. 运行 `npx crewup gate-check <run-id>`。
3. 如果 tester/reviewer 有 required fixes，使用 `repair-plan` 分配回 owner agent。
4. 不要让主 agent 继续直接改业务文件。

## 用户项目里的 `.harness` 被修改

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
```

如果这是 CrewUp 产品自身 bug，应回到 CrewUp 源码仓库修复、测试、发版，而不是在用户项目 run 中顺手修 core。
