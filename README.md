# CrewUp

中文 | [English](./README.en.md)

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp 是一套面向大型项目和严谨交付场景的 AI Harness。它不是“让一个主 agent 什么都做”的提示词集合，而是一层工作流控制协议：明确什么时候进入正式流程，谁负责需求、架构、实现、测试、评审、文档和发布，哪些产物必须由对应角色生成，哪些门禁必须通过。

它的核心目标很直接：让 AI 开发从随意 vibecoding 变成可追踪、可分工、可验收、可归档的工程流程。

## 适合谁

- 想把 AI 开发流程标准化的个人开发者或团队
- 正在做中大型项目、长期项目、复杂重构、全栈系统或多模块工程
- 希望主 agent 保持调度角色，不让它越权写需求、架构、实现和测试产物
- 希望在 Codex、Claude、Cursor、Trae 或人工执行之间保留统一交付协议

小修小补、一次性脚本、普通问答通常不需要 CrewUp。CrewUp 默认显式启用，安装后不会接管所有聊天。

## 架构理念

CrewUp 把 AI 工程流程拆成三层：

| 层级 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| Main Agent | 创建 run、选择流程类型、生成任务、调度子 agent、登记结果、执行 gate、向用户汇总 | 代写正式需求、架构、业务代码、测试报告、评审报告 |
| Role Agents | 需求、架构、前端、后端、数据库、DevOps、测试、评审、文档、发布等角色产物 | 绕过 run state、越权写其他角色产物 |
| Harness Gates | 检查入口、依赖顺序、产物归属、写入范围、测试/评审反馈、服务关闭、归档条件 | 替代项目自己的测试、CI/CD、编码规范 |

默认正式顺序：

```text
intake -> requirements_plan -> requirements_confirm -> plan
  -> implement -> verify -> review -> release -> done
```

严格流程不会因为任务小就自动跳过角色。CrewUp 减少浪费的方式是更清晰的任务契约、更准确的 agent 路由、更少的返工，而不是把主 agent 重新变成万能执行者。

## 核心能力

- 显式启用：只有 `npx crewup run` 或聊天中明确要求 CrewUp / harness 流程时才进入正式工作流
- 主 agent 边界：主 agent 只调度、检查、汇总，不代写 owner artifact 或业务代码
- 顺序调度：`next-agent` 只返回当前依赖已满足的子 agent，避免 requirements 和 architect 并行乱跑
- 产物归属：`requirement.md`、`architecture.md`、`implementation-plan.md`、`test-report.md` 等必须由对应角色写入
- Schema-first：子 agent 任务内包含必需 heading 和写入契约，减少 gate 后返工
- 否定范围识别：当用户明确排除某些范围时，CrewUp 不会误触发对应 agent 或高风险分类；正常情况下，应该由需求和架构阶段判断需要哪些实现 agent
- 中文人类沟通：主 agent / 子 agent 的总结、handoff、blocker、状态说明默认中文
- 英文机器契约：artifact heading、JSON 字段、路径、命令、状态值保持英文，降低乱码和 gate 误判
- 反馈回路：tester/reviewer 的问题必须路由回对应实现 agent，而不是主 agent 直接修
- 运行态归档：run、报告、dashboard、knowledge、backlog 等运行状态有明确目录和保留策略
- 安全升级：`install --force` 更新 harness core，同时保留已有 runs、knowledge、project adapter、reports、dashboard 和 backlog

## 安装

新项目或目标项目中安装：

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

## 模型访问和 API Key

CrewUp 是工作流 harness，不自带模型额度、API key 或内置子 agent runtime。

如果选择 `codex` native 模式，需要你的 Codex 环境本身可以启动 native 子 agent。根据你的使用方式，这可能是已登录的 Codex Desktop / CLI，也可能是 API-backed automation。SDK/API 路径和 `inspect --ai` 需要配置 `OPENAI_API_KEY`：

```bash
export OPENAI_API_KEY="sk-..."
```

Windows PowerShell：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

如果选择 `claude`、`cursor`、`trae`，CrewUp 当前走 Universal Agent Bridge。这些工具使用它们自己的登录态、API key 或订阅，然后把 CrewUp 兼容的 result JSON 写回 run 目录。

如果选择 `manual`，不需要 AI API key。CrewUp 只生成任务、上下文、门禁和报告，人或外部工具负责执行 handoff 并写回结果。

已有项目、monorepo 或目录结构复杂的仓库，建议先做一次无 AI 扫描：

```bash
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
```

升级已经安装过 CrewUp 的项目：

```bash
npx crewup install --force
```

`--force` 会更新 `.harness` 核心文件，但保留 `.harness/runs/`、`.harness/knowledge/`、`.harness/project/`、`.harness/reports/`、`.harness/dashboard/` 和 backlog。只有明确想重装并删除旧运行状态时，才使用：

```bash
npx crewup install --reset
```

## 使用方式

CLI 方式：

```bash
npx crewup run "Use CrewUp to plan and implement a todo MVP with requirements, architecture, frontend implementation, tester verification, reviewer review, and release summary. Keep the implementation small."
```

聊天窗方式：

```text
使用 CrewUp 规划并实现一个很小的 Todo MVP。保持完整流程：需求、架构、实现、测试、评审、发布。先由需求和架构阶段确认范围，再按架构方案分配实现 agent。
```

当用户在聊天中明确要求 CrewUp 时，主 agent 应该自己执行 `npx crewup run "<user request>"`，提取 runId，然后调用 `npx crewup next-agent <run-id>` 继续调度。用户不需要为了获得 runId 单独先跑命令。

没有显式 CrewUp 信号时，普通聊天仍然是普通 assistant 工作。

## 第一个完整案例

用这个小案例测试完整流程，成本比较低：

```text
使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做一个很小的前端实现；不需要 backend、database、auth、routing。
```

run 创建后检查调度：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

更多可复制案例见 [examples/crewup-cases](./examples/crewup-cases/README.md)。

如果在 Windows 终端看到中文乱码，先运行 `npx crewup doctor` 查看 terminal encoding。CrewUp 文件按 UTF-8 管理，主 agent 读取本地文档时应使用显式 UTF-8。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npx crewup doctor` | 检查本地环境和依赖 |
| `npx crewup install` | 安装 CrewUp harness 模板 |
| `npx crewup install --force` | 安全升级 harness core，保留运行态数据 |
| `npx crewup inspect --no-ai` | 无 AI 扫描项目结构 |
| `npx crewup init --agent codex --yes` | 生成项目适配层和运行配置 |
| `npx crewup check` | 校验 harness 配置、脚本和模板 |
| `npx crewup run "..."` | 创建正式 run |
| `npx crewup run --dry-run "..."` | 只预览命名、流程类型和 agent 路由 |
| `npx crewup next-agent <run-id>` | 查看当前可启动的子 agent 和阻塞原因 |
| `npx crewup native-state <run-id> diagnose` | 诊断 native 子 agent handle、结果和状态缺口 |
| `npx crewup audit <run-id>` | 审计调度顺序、owner 边界、修复回路和上下文压力 |
| `npx crewup gate-check <run-id>` | 检查 gate、产物归属和越权风险 |
| `npx crewup report <run-id>` | 生成结构化交付报告 |
| `npx crewup finish <run-id>` | 完成 run 并按策略归档 |
| `npx crewup dashboard` | 生成或刷新 `.harness/dashboard/index.html` |
| `npx crewup integrations status` | 查看可选集成状态，例如 CodeGraph |
| `npx crewup dev-service <run-id> start` | 启动 run 级预览服务 |
| `npx crewup dev-service <run-id> stop` | 关闭 run 级预览服务 |

目标项目里优先使用 `npx crewup ...`，因为用户项目的 `package.json` 不一定包含 `npm run harness:*` 脚本。

更多内部流水线和维护命令见 [Script Map](./docs/harness-script-map.md)。普通开发者不需要记住所有 `.harness/scripts` 文件。

## 流程类型

| Profile | 适用场景 | 规则 |
| --- | --- | --- |
| `discovery` | 新项目调研、模块边界、技术方向 | 只做发现和规划，不直接实现 |
| `plan_only` | 用户明确说只规划、不写代码 | business code gate 启用 |
| `lite` | 较窄但仍正式的工程任务 | 仍然委派和过 gate，不是随手模式 |
| `standard` | 常规多文件开发任务 | 完整任务、上下文、实现、验证流程 |
| `full` | 高风险、大范围、多阶段或用户明确要求严格流程 | 强需求、架构、测试、评审、发布门禁 |

## 子 Agent 什么时候启动

典型规划到开发流程：

1. Main agent 创建 run，冻结输入，生成任务和 native plan。
2. `requirements-plan` 写 `artifacts/requirement-plan.md`。
3. `requirements` 在前置结果完成后写 `artifacts/requirement.md`。
4. `architect` 在需求完成后写 `artifacts/architecture.md` 和 `artifacts/implementation-plan.md`。
5. 实现类 agent 根据影响范围启动，例如 `frontend`、`backend`、`database`、`devops`、`docs`。
6. `tester` 验证实现结果，并输出 `artifacts/test-report.md`。
7. `reviewer` 审查实现、产物、风险和测试证据。
8. `release` 输出 `artifacts/release-summary.md`，完成报告和归档。

正常情况下，用户只需要描述目标和约束，具体需要哪些实现 agent 应由 requirements/architect 的产物和影响范围决定。否定范围识别只用于用户已经明确排除某些范围时，避免 CrewUp 为无关模块启动 owner agent。

## 目录结构

```text
.harness/
  AGENTS.md                # CrewUp 入口约定
  orchestrator/            # main agent、路由、native/bridge 协议
  config/                  # workflow、model、gate、delegation、write policy
  project/                 # init 生成的项目适配层
  runs/                    # 每次 run 的输入、任务、产物、日志
  reports/                 # 交付报告
  dashboard/               # dashboard 输出位置
  knowledge/               # lessons 和可复用上下文
```

## 可选集成

CrewUp core 不强依赖 CodeGraph 或其他外部代码智能工具。可选集成通过状态命令查看：

```bash
npx crewup integrations status
```

CodeGraph 适合大型代码库的代码结构索引和影响面辅助分析。它不替代 `.harness/knowledge/`，前者偏代码事实索引，后者偏项目经验、决策和复盘。

## 本地验证

```bash
npm run harness:check
npm test
npm run test:pack-install
npm run release:preflight
```

`release:preflight` 会执行 harness 校验、示例项目测试、临时项目 pack-install 流程测试，以及 `npm pack --dry-run`。

## 更多文档

| 文档 | 内容 |
| --- | --- |
| [Workflow](./docs/harness-workflow.md) | 命令流、profile、run 生命周期 |
| [Getting Started](./docs/getting-started.md) | 安装、API key、第一次 run 和排错 |
| [Local Testing](./docs/local-testing.md) | 用 `npm pack` 和临时项目本地测试 CrewUp |
| [Universal Agent Bridge](./docs/universal-agent-bridge.md) | 外部 agent handoff 和 result JSON 契约 |
| [Agent Selection](./docs/harness-agent-selection.md) | agent 选择和适配层生成 |
| [Agent Capabilities](./docs/harness-agent-capabilities.md) | 支持等级、能力边界和声明 |
| [Core Boundary](./docs/harness-core-boundary.md) | core、project adapter、runtime 边界 |
| [Script Map](./docs/harness-script-map.md) | 核心入口、内部流水线、可选脚本和收敛方向 |
| [Optional Integrations](./docs/optional-integrations.md) | CodeGraph 等可选集成 |
| [Extension Guide](./docs/harness-extension-guide.md) | skills、policies、rules、templates 扩展 |

## 边界

CrewUp 不替代你的框架、测试工具、CI/CD、业务架构或团队规范。它提供的是 AI 协作和交付闭环协议。真实项目仍然应该保留自己的 README、测试命令、发布流程和编码标准，CrewUp 会在初始化和运行过程中读取并遵守这些项目事实。
