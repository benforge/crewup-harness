# 快速开始

[English](./getting-started.en.md) | 中文

这份文档面向第一次使用 CrewUp 的开发者。CrewUp 是工作流 harness，不是模型服务本身。它负责创建 run、生成角色任务、约束主 agent 和子 agent 的边界、检查门禁、生成报告；真正执行子 agent 的能力来自你选择的 agent 环境。

## 前置条件

- Node.js 20 或更高版本
- npm / pnpm / yarn 其中一种包管理器
- 一个 Git 仓库，真实项目建议先 `git init`
- 一个可执行的 agent 环境：Codex、Claude、Cursor、Trae 或 Manual
- 如果要运行 AI 子 agent，需要先配置对应工具的模型访问方式

## API Key 和子 Agent

CrewUp 不会自带 OpenAI API key，也不会替用户创建模型账号。

如果选择 `codex`：

- Codex Desktop / Codex CLI 已登录并支持 native subagent 时，可以走 native 子 agent 工作流。
- SDK/API 编排、`inspect --ai` 或需要 OpenAI API 的自动化路径，需要设置 `OPENAI_API_KEY`。

PowerShell：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

macOS / Linux：

```bash
export OPENAI_API_KEY="sk-..."
```

如果选择 `claude`、`cursor`、`trae`：

- 当前是 bridge 模式，不宣称原生多 agent API。
- CrewUp 生成 handoff 和 result JSON 契约。
- 外部工具使用自己的登录态、API key 或订阅。
- 外部工具完成后，必须把结果写回 `.harness/runs/<run-id>/logs/agent-bridge/<agent>.result.json`。

如果选择 `manual`，不需要 AI API key。CrewUp 只生成任务、上下文、门禁和报告，由人或外部工具执行并写回 result JSON。

## 安装

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

只有配置好 API key，并且希望模型基于真实项目证据补充适配层时，才运行：

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
- selected agent 是否是你想要的环境
- SDK/API 模式或 `inspect --ai` 是否已设置 `OPENAI_API_KEY`
- Windows terminal encoding 是否可能导致中文显示乱码

## 启动一个 Run

CLI：

```bash
npx crewup run "使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做很小的前端实现；不需要 backend、database、auth、routing。"
```

聊天窗口：

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
npx crewup report <run-id>
```

- `next-agent` 告诉你现在真正能启动哪个子 agent。
- `audit` 检查流程有没有乱：提前启动、主 agent 越界、owner artifact 缺 provenance、上下文压力、重复返工等。
- `gate-check` 判断当前阶段能否通过质量门禁。
- `report` 汇总 agent 结果、artifact、token/context budget、返修 lineage 和归档状态。

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

## 工具降级

如果 Context7、MCP、插件或其他可选工具不可用，不要只在聊天里说明，应记录到 run：

```bash
npx crewup tool-fallback <run-id> --tool Context7 --reason "not available in this session" --fallback "use checked-in docs and architect synthesis"
```

这只是证据日志，不会授权主 agent 接管 architect、tester、reviewer 或 implementation owner 的职责。

## 完成与归档

```bash
npx crewup report <run-id>
npx crewup finish <run-id>
```

如果 run 里启动了预览服务：

```bash
npx crewup dev-service <run-id> stop
```

`finish` 前应确保服务关闭、tester/reviewer 问题已回派修复、`audit` 和 `gate-check` 通过。默认先 audit/gate/report，再关闭保留的子 agent。

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
