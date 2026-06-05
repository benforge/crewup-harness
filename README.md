<p align="center">
  <img src="./assets/crewup-hero.svg" alt="CrewUp" width="780" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/crewup-harness"><img src="https://img.shields.io/npm/v/crewup-harness?color=1f6feb" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="MIT license" /></a>
  <a href="./docs/harness-workflow.md"><img src="https://img.shields.io/badge/workflow-strict-blue" alt="strict workflow" /></a>
  <a href="./docs/runbook.md"><img src="https://img.shields.io/badge/runbook-ready-black" alt="runbook" /></a>
</p>

<h3 align="center">
  一个面向大型项目的 AI 开发工作流 Harness
</h3>

<p align="center">
  <a href="./README.en.md">English</a>
  ·
  <a href="./docs/getting-started.md">快速开始</a>
  ·
  <a href="./docs/harness-workflow.md">工作流</a>
  ·
  <a href="./docs/runbook.md">Runbook</a>
  ·
  <a href="./docs/test-matrix.md">测试矩阵</a>
</p>

---

CrewUp 是一套可复用的 AI workflow harness。它不是一个新的模型，也不是一个简单 prompt 包，而是一套把需求澄清、架构设计、开发实现、测试、审查、发布和归档串起来的严格流程。

它的目标很明确：让 AI 在大型项目里不要失控。

在 CrewUp 里，主 agent 只负责调度，正式产物由对应子 agent 负责：

- `requirements-plan` 负责需求澄清、问题、边界、非目标、验收标准草稿
- `requirements` 负责正式 `requirement.md`
- `architect` 负责 `architecture.md` 和 `implementation-plan.md`
- `frontend` / `backend` / `database` / `devops` / `docs` 负责对应实现
- `tester` 负责验证
- `reviewer` 负责审查
- `release` 负责发布总结

主 agent 不应该代写需求文档、架构文档、实现计划、测试报告或业务代码。

## 为什么需要 CrewUp

很多 vibe coding 的问题不是模型不会写代码，而是流程没有边界：

- 需求还没确认就开始写代码
- 架构没定，多个 agent 并行乱跑
- 测试反馈后主 agent 直接改业务文件
- 聊天上下文堆满日志、计划、产物和返工记录
- 一次需求到底是完成、失败、取消还是卡住，没人说得清
- 用户项目里的 `.harness` 被运行中的 agent 顺手修坏

CrewUp 通过 run、owner artifact、`next-agent`、gate、audit、sealed core 和 archive，把这些问题变成可检查的流程状态。

## 安装

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

升级已有项目：

```bash
npx crewup install --force
```

`--force` 会更新 `.harness` 核心文件，同时保留：

- `.harness/runs/`
- `.harness/knowledge/`
- `.harness/project/`
- `.harness/reports/`
- `.harness/dashboard/`

如果你明确要清空旧 `.harness/` 后重装：

```bash
npx crewup install --reset
```

`--reset` 是破坏性重装，会删除旧 run、knowledge、project adapter、reports 和 dashboard。

## 第一次使用

在聊天里明确说“使用 CrewUp”即可：

```text
使用 CrewUp 做一个最小 counter web app，跑完整 workflow。
验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。
范围：只做很小的前端实现。
```

主 agent 应自己运行：

```bash
npx crewup run "<你的需求>"
npx crewup next-agent <run-id>
```

用户不需要为了拿 runId 先手动跑命令。

## 工作流

CrewUp 的默认正式流程是：

```text
requirements-plan
  -> requirements
  -> architect
  -> implementation agents assigned by implementation-plan.md
  -> tester
  -> reviewer
  -> release
```

关键规则：

- 初始 `next-agent` 只应该允许 `requirements-plan`
- `requirements` 必须等 `requirements-plan` 完成
- `architect` 必须等 `requirements` 完成
- 实现类 agent 只是候选，必须等 `implementation-plan.md` 精确分配后才启动
- tester/reviewer 的反馈必须回派给对应 owner agent
- 主 agent 只汇报状态、路径和下一步，不粘贴长结果

查看当前状态：

```bash
npx crewup status <run-id>
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

## Run 是核心工作单元

每次正式需求都会创建一个 run：

```text
.harness/runs/<run-id>/
```

常看文件：

| 文件 | 作用 |
| --- | --- |
| `RUN_STATUS.md` | 当前状态、owner、下一步、阻塞 |
| `RUN_SUMMARY.md` | 归档摘要，可供后续 run 继续 |
| `artifacts/requirement.md` | 正式需求 |
| `artifacts/architecture.md` | 架构设计 |
| `artifacts/implementation-plan.md` | 实现分配 |
| `logs/run-report.md` | 当前 run 报告 |

run 不一定只有成功一种结局。CrewUp 支持：

- `success`
- `partial`
- `blocked`
- `canceled`
- `failed`

归档一个非成功 run：

```bash
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable"
npx crewup cancel <run-id> --reason="scope changed"
```

继续一个历史 run：

```bash
npx crewup continue <source-run-id> "继续处理上次未完成的问题"
```

## Sealed Core

CrewUp 安装后会生成：

```text
.harness/core-lock.json
```

它记录 `.harness` 可复用核心文件的指纹。用户项目的业务 run 不能修改：

```text
.harness/scripts/**
.harness/config/**
.harness/orchestrator/**
.harness/agents/**
.harness/templates/**
.harness/contracts/**
.harness/rules/**
```

如果 `crewup check` 提示 sealed core 漂移：

```bash
npx crewup install --force
```

如果这是 CrewUp 产品自身 bug，应在 CrewUp 源码仓库修复、测试、发版，而不是在用户项目的业务 run 里顺手修改 `.harness`。

## API Key 和子 Agent

CrewUp 不自带模型额度，也不替你登录任何模型服务。

- `codex` native 模式依赖当前 Codex Desktop / CLI 的登录态和 native subagent 能力
- SDK/API 路径和 `inspect --ai` 需要 `OPENAI_API_KEY`
- `claude`、`cursor`、`trae` 当前通过 Universal Agent Bridge 接入，各自使用自己的登录态或 API key
- `manual` 不需要 AI API key，由人或外部工具执行 handoff 并写回结果

PowerShell 示例：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npx crewup doctor` | 检查环境、可选集成、sealed core |
| `npx crewup install` | 安装 CrewUp harness 模板 |
| `npx crewup install --force` | 安全升级 harness core，保留运行态数据 |
| `npx crewup install --reset` | 清空旧 `.harness/` 后重装 |
| `npx crewup init --agent codex --yes` | 生成项目适配层 |
| `npx crewup check` | 校验 harness 配置、脚本、模板和 sealed core |
| `npx crewup run "..."` | 创建正式 run |
| `npx crewup run --dry-run "..."` | 预览命名、profile 和 agent 路由 |
| `npx crewup status <run-id>` | 查看 run 状态卡 |
| `npx crewup next-agent <run-id>` | 查看当前真正可启动的子 agent |
| `npx crewup clarify <run-id> --interactive` | 在终端中回答需求澄清问题 |
| `npx crewup audit <run-id>` | 审计调度顺序、owner 边界和上下文压力 |
| `npx crewup gate-check <run-id>` | 检查 gate、产物归属和越权风险 |
| `npx crewup report <run-id>` | 生成结构化交付报告 |
| `npx crewup finish <run-id>` | 成功完成并归档 run |

## 本地验证

```bash
npm run harness:check
npm test
npm run test:install-flow
npm run test:pack-install
npm run release:preflight
```

`test:install-flow` 专门覆盖安装、升级、`--force`、`--reset` 和 sealed core。

`release:preflight` 会运行 harness 校验、示例测试、临时项目 pack-install flow 测试和 `npm pack --dry-run`。

## 文档

| 文档 | 内容 |
| --- | --- |
| [Getting Started](./docs/getting-started.md) | 安装、API key、第一次 run 和排错 |
| [Workflow](./docs/harness-workflow.md) | 工作流、owner artifact、tool fallback、audit/gate |
| [Runbook](./docs/runbook.md) | 判断 run 是否正常、怎么算完成、卡住/取消/继续怎么办 |
| [Local Testing](./docs/local-testing.md) | 用 `npm pack` 和临时项目本地测试 CrewUp |
| [Test Matrix](./docs/test-matrix.md) | 不同改动应该跑哪些验证命令 |
| [Core Boundary](./docs/harness-core-boundary.md) | `.harness` 核心、项目适配层和运行态边界 |
| [Universal Agent Bridge](./docs/universal-agent-bridge.md) | 外部 agent handoff 和 result JSON 契约 |
| [Script Map](./docs/harness-script-map.md) | 核心命令、内部流水线和维护脚本边界 |

## 适合谁

CrewUp 更适合长期迭代的大型项目、团队项目或需要严格 AI 开发流程的代码库。

如果只是一次性小修、小问答、临时脚本或非常小的个人试验，可以不启用 CrewUp。

安装 CrewUp 不代表接管所有 AI 对话。只有你明确说“使用 CrewUp / 按 harness 流程 / 继续某个 CrewUp run”时，才进入严格工作流。
