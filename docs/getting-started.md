# 快速开始

[English](./getting-started.en.md) | 中文

这份文档面向第一次使用 CrewUp 的开发者。CrewUp 是工作流 harness，不是模型服务本身。它负责创建 run、生成任务、约束主 agent 和子 agent 的边界、检查门禁、生成报告；真正执行子 agent 的能力来自你选择的 agent 环境。

## 前置条件

- Node.js 20 或更高版本
- npm / pnpm / yarn 其中一种包管理器
- Git 仓库，推荐在真实项目里先 `git init`
- 一个可执行的 agent 环境：Codex、Claude、Cursor、Trae 或 Manual
- 如果要运行 AI 子 agent，需要先配置对应工具的模型访问方式

## API Key 和子 Agent

CrewUp 不会自带 OpenAI API key，也不会替用户创建模型账号。

如果选择 `codex`：

- Codex Desktop / Codex CLI 已登录并支持 native subagent 时，可以走 native 子 agent 工作流。
- SDK/API 编排、`inspect --ai` 或需要 OpenAI API 的自动化路径，需要设置 `OPENAI_API_KEY`。
- Windows PowerShell 示例：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

- macOS / Linux 示例：

```bash
export OPENAI_API_KEY="sk-..."
```

如果选择 `claude`、`cursor`、`trae`：

- 当前是 bridge 模式，不宣称原生多 agent API。
- CrewUp 会生成 handoff 和 result JSON 契约。
- 外部工具需要使用它自己的登录态、API key 或订阅。
- 外部工具完成任务后，必须把结果写回 `.harness/runs/<run-id>/logs/agent-bridge/<agent>.result.json`。

如果选择 `manual`：

- 不需要 AI API key。
- CrewUp 只生成任务、上下文、门禁和报告。
- 人或外部工具手动执行任务并写回 result JSON。

## 安装

在目标项目里运行：

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

已有项目或 monorepo 建议先扫描：

```bash
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
```

只有你已经配置好 API key，并且希望模型基于真实项目证据补充适配层时，才运行：

```bash
npx crewup inspect --ai
```

## 检查环境

```bash
npx crewup doctor
```

重点看：

- `.harness/` 是否存在
- `.harness/project/profile.yaml` 是否已生成
- `OPENAI_API_KEY` 是否已设置，只有 SDK/API 模式或 `inspect --ai` 必须
- selected agent 是否是你想要的环境

## 启动一个 Run

CLI 方式：

```bash
npx crewup run "使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做很小的前端实现；不需要 backend、database、auth、routing。"
```

聊天窗口方式：

```text
使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做很小的前端实现；不需要 backend、database、auth、routing。
```

当你在聊天里明确说“使用 CrewUp”时，主 agent 应该自己运行 `npx crewup run "<需求>"`，提取 runId，然后用 `next-agent` 调度。

## 观察调度

拿到 runId 后：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

- `next-agent` 告诉你现在真正能启动哪个子 agent
- `audit` 检查流程有没有乱：提前启动、主 agent 越界、owner artifact 缺 provenance、上下文压力等
- `gate-check` 判断当前阶段能否通过质量门禁

## 正常启动顺序

```text
requirements-plan
  -> requirements
  -> architect
  -> implementation agents selected by implementation-plan.md
  -> tester
  -> reviewer
  -> release
```

实现类 agent 在 run 创建时只是候选。真正启动哪些实现 agent，应由 `architect` 写出的 `artifacts/implementation-plan.md` 决定。

## 完成与归档

```bash
npx crewup report <run-id>
npx crewup finish <run-id>
```

如果 run 里启动了预览服务：

```bash
npx crewup dev-service <run-id> stop
```

`finish` 前应确保服务关闭、tester/reviewer 问题已回派修复、gate-check 通过。

## 常见问题

### 为什么子 agent 没启动？

常见原因：

- 当前 agent 不是 `next-agent` 返回的 runnable
- 上游 agent 还没有真实 handle/result
- native subagent 工具不可用
- 选择的是 bridge/manual 模式，需要手动执行 handoff
- API key 或外部 agent 登录态未配置

### 主 agent 能不能直接写业务代码？

正式 CrewUp run 里不应该。主 agent 负责调度、登记、检查和汇总。业务代码和 owner artifact 应由对应子 agent 写入。`audit` 和 `gate-check` 会检查越界风险。

### 中文乱码怎么办？

CrewUp 的机器契约使用英文 heading、JSON 字段、状态值和命令，降低乱码导致的 gate 误判。人类可见的总结、handoff、blocker 默认中文。

先运行：

```bash
npx crewup doctor
```

如果 Windows terminal encoding 不是 CP65001，PowerShell 可能把中文显示成乱码。可以临时切换：

```powershell
chcp 65001
```

读取文件时优先使用：

```powershell
Get-Content README.md -Encoding UTF8
```

或者用支持 UTF-8 的编辑器查看文件。主 agent 在 harness 内读取本地文档时，也应先使用显式 UTF-8，不应根据乱码终端输出判断文档内容有问题。
