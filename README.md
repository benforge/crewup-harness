# CrewUp

中文 | [English](./README.en.md)

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp 是一套面向大型项目和严谨交付场景的 AI Harness。它不是让一个主 agent 什么都做的提示词集合，而是一套工作流控制协议：什么时候进入正式流程、谁负责需求、谁负责架构、谁负责实现、谁负责测试和评审、哪些门禁必须通过、哪些结果可以归档，都有清楚边界。

核心目标：把随意 vibecoding 变成可追踪、可分工、可验收、可归档的工程流程。

## 适合谁

- 想把 AI 开发流程标准化的个人开发者或团队
- 中大型项目、长期项目、复杂重构、全栈系统或多模块工程
- 希望主 agent 只负责调度，而不是越权代写需求、架构、实现和测试产物
- 希望在 Codex、Claude、Cursor、Trae 或人工执行之间保留统一交付协议

小修小补、一次性脚本、普通问答通常不需要 CrewUp。CrewUp 是显式启用，安装后不会接管所有聊天。

## 核心理念

| 层级 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| Main Agent | 创建 run、选择流程、生成任务、调度子 agent、登记结果、执行 gate、汇总给用户 | 代写正式需求、架构、业务代码、测试报告、评审报告 |
| Role Agents | requirements、architect、frontend、backend、database、devops、tester、reviewer、docs、release 等角色产物 | 绕过 run state、越权写其他角色产物 |
| Harness Gates | 检查入口、依赖顺序、产物归属、写入范围、反馈回派、服务关闭、归档条件 | 替代项目自己的测试、CI/CD、编码规范 |

默认正式顺序：

```text
intake -> requirements_plan -> requirements_confirm -> plan
  -> implement -> verify -> review -> release -> done
```

CrewUp 不靠跳过角色省成本，而是通过更清楚的任务契约、更准确的 agent 路由、更少的重复返工来减少浪费。即使是 `lite`，也只是更短的需求/架构产物，不是绕过需求确认和架构分配直接开发。

## 核心能力

- 显式启用：只有 `npx crewup run` 或聊天中明确要求 CrewUp / harness 流程时才进入正式工作流。
- 主 agent 边界：主 agent 只调度、检查、汇总，不代写 owner artifact 或业务代码。
- 顺序调度：`next-agent` 只返回当前依赖已满足的子 agent，避免 requirements 和 architect 并行乱跑。
- 稳定前置：正式 run 的第一个 runnable agent 始终应是 `requirements-plan`，开发 agent 不应直接启动。
- 交互澄清：`requirements-plan` 先生成 Markdown 需求确认卡，再返回少量结构化问题；其他环境使用 `crewup clarify --interactive`。
- 架构分配：implementation agents 只是候选；真正启动哪些实现 agent，由 architect 的 `implementation-plan.md` 决定。
- 产物归属：`requirement.md`、`architecture.md`、`implementation-plan.md`、`test-report.md` 等必须由对应角色写入。
- 反馈回路：tester/reviewer 的问题必须回派给 owner agent，主 agent 不直接修业务代码。
- 可审计降级：Context7、MCP、插件等可选工具不可用时，用 `tool-fallback` 写入 run logs。
- 返修 lineage：返修结果保留 `repairOf`、`repairReason`、`previousResultPath`，减少重复返工。
- 语言跟随：面向用户的沟通跟随用户主要语言，机器契约和 artifact headings 保持英文以降低编码误判。
- 安全升级：`install --force` 更新 harness core，同时保留 runs、knowledge、project adapter、reports 和 dashboard。

## 安装

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

已有复杂项目建议先扫描：

```bash
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
```

升级已安装项目：

```bash
npx crewup install --force
```

`--force` 会更新 `.harness` 核心文件，但保留 `.harness/runs/`、`.harness/knowledge/`、`.harness/project/`、`.harness/reports/` 和 `.harness/dashboard/`。只有明确想删除旧运行态时才使用：

```bash
npx crewup install --reset
```

## API Key 和子 Agent

CrewUp 是工作流 harness，不自带模型额度、API key 或内置子 agent runtime。

- `codex` native 模式需要当前 Codex 环境能启动 native 子 agent。Codex Desktop / CLI 可能使用自己的登录态；SDK/API 路径和 `inspect --ai` 需要 `OPENAI_API_KEY`。
- `claude`、`cursor`、`trae` 当前使用 Universal Agent Bridge。它们使用自己的登录态或 API key，然后把 CrewUp 兼容 result JSON 写回 run。
- `manual` 不需要 AI API key，由人或外部工具执行 handoff 并写回结果。

PowerShell 设置 API key 示例：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

## 使用

CLI：

```bash
npx crewup run "Use CrewUp to plan and implement a tiny Todo MVP. Keep the full flow: requirements, architecture, implementation, tester, reviewer, release."
```

聊天窗：

```text
使用 CrewUp 规划并实现一个很小的 Todo MVP。保持完整流程：需求、架构、实现、测试、评审、发布。先由需求和架构阶段确认范围，再按架构方案分配实现 agent。
```

当用户在聊天中明确要求 CrewUp 时，主 agent 应自己执行 `npx crewup run "<user request>"`，提取 runId，然后调用 `npx crewup next-agent <run-id>` 继续调度。用户不需要为了获取 runId 单独先跑命令。

## 最小完整案例

```text
使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做一个很小的前端实现；不需要 backend、database、auth、routing。
```

创建 run 后检查流程：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

更多示例见 [examples/crewup-cases](./examples/crewup-cases/README.md)。

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
| `npx crewup run --dry-run "..."` | 预览命名、profile 和 agent 路由 |
| `npx crewup status` / `npx crewup status <run-id>` | 查看所有 run 或单个 run 的状态卡 |
| `npx crewup runs` | `status` 列表视图别名 |
| `npx crewup next-agent <run-id>` | 查看当前可启动子 agent 和阻塞原因；正式 run 初始应只有 `requirements-plan` |
| `npx crewup clarify <run-id>` | 展示 `requirements-plan` 生成的澄清问题和选择项 |
| `npx crewup clarify <run-id> --interactive` | 在真实终端里用键盘上下选择并保存答案 |
| `npx crewup native-state <run-id> diagnose` | 诊断 native 子 agent handle、结果和状态缺口 |
| `npx crewup tool-fallback <run-id> --tool Context7 --reason "..." --fallback "..."` | 记录可选工具降级证据 |
| `npx crewup audit <run-id>` | 审计调度顺序、owner 边界、修复回路和上下文压力 |
| `npx crewup gate-check <run-id>` | 检查 gate、产物归属和越权风险 |
| `npx crewup report <run-id>` | 生成结构化交付报告 |
| `npx crewup archive <run-id> --outcome=blocked --reason="..."` | 归档非成功结局，保存现场和报告 |
| `npx crewup cancel <run-id> --reason="..."` | 取消 run 并归档取消原因，不自动丢弃文件 |
| `npx crewup continue <run-id> "..."` | 基于历史 run 创建新的延续 run |
| `npx crewup finish <run-id>` | 完成 run 并按策略归档 |
| `npx crewup dashboard` | 生成或刷新 dashboard |
| `npx crewup integrations status` | 查看可选集成状态，例如 CodeGraph |

目标项目里优先使用 `npx crewup ...`，因为用户项目的 `package.json` 不一定包含 `npm run harness:*` 脚本。

## 子 Agent 启动时机

1. Main agent 创建 run、冻结输入、生成任务和 native plan。
2. `requirements-plan` 写 `artifacts/requirement-plan.md`。
3. `requirements` 在前置结果完成后写 `artifacts/requirement.md`。
4. `architect` 在需求完成后写 `artifacts/architecture.md` 和 `artifacts/implementation-plan.md`。
5. `frontend`、`backend`、`database`、`devops`、`docs` 等实现 agent 只在 `implementation-plan.md` 存在且精确分配后启动。
6. `tester` 验证实现结果并写 `artifacts/test-report.md`。
7. `reviewer` 审查实现、产物、风险和测试证据。
8. `release` 写 `artifacts/release-summary.md`，然后 run 可以 report / finish / archive。

## 文档

| 文档 | 内容 |
| --- | --- |
| [Workflow](./docs/harness-workflow.md) | 工作流、owner artifact、tool fallback、audit/gate |
| [Runbook](./docs/runbook.md) | 判断 run 是否正常、怎么算完成、卡住/取消/继续怎么办 |
| [Getting Started](./docs/getting-started.md) | 安装、API key、第一次 run 和排错 |
| [Local Testing](./docs/local-testing.md) | 用 `npm pack` 和临时项目本地测试 CrewUp |
| [Universal Agent Bridge](./docs/universal-agent-bridge.md) | 外部 agent handoff 和 result JSON 契约 |
| [Script Map](./docs/harness-script-map.md) | 核心命令、内部流水线和维护脚本边界 |
| [Agent Selection](./docs/harness-agent-selection.md) | agent 选择和适配层生成 |
| [Agent Capabilities](./docs/harness-agent-capabilities.md) | 支持等级、能力边界和声明 |
