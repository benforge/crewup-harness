# CrewUp

中文 | [English](./README.en.md)

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp 是一套面向大型、正式工程项目的 AI harness。它不负责替代某个 agent 写代码，而是把“什么时候进入流程、谁生成什么产物、谁执行实现、哪些门禁必须通过、最终如何归档”变成一套可复用、可检查、可追踪的工作流。

CrewUp 的默认理念很明确：

- 没有明确说 `CrewUp`、`harness`、`crewup run` 或类似触发词时，聊天窗仍然是普通助手对话。
- 一旦明确进入 CrewUp，主 agent 只负责调度、委派、门禁和汇总，不直接承担正式业务实现或主要产物撰写。
- requirements、architect、builder、tester、reviewer、docs、release 等产物由对应子 agent 或外部执行者负责。
- CrewUp 面向大型项目和严谨流程；小修小补、临时问答、一次性脚本通常不需要启用它。

## 适用场景

- 需要把 AI 开发流程标准化的团队或个人
- 需要在 Codex、Claude、Cursor、Trae 或人工执行之间保持一致交付协议的项目
- 需要把需求、架构、实现、验证、审查、发布准备和归档串成闭环的真实仓库
- 希望主 agent 不失控、不越权，只做 orchestration 的大型 AI 工程流程

## 核心能力

- 显式 opt-in：只有明确请求 CrewUp/harness 流程时才进入严格工作流
- 项目适配：先 `inspect` 真实仓库，再 `init` 生成 `.harness/project/` 适配层
- 严格委派：主 agent 负责 route/delegate/gate/summarize，产物由对应角色生成
- 阶段门禁：stage entry gate、artifact provenance、no-code profile gate 防止越权和漏产物
- 多执行环境：Codex native 优先，Claude/Cursor/Trae/manual 通过 Universal Agent Bridge 写回结果
- 发布自测：提供本地检查、临时项目 pack-install 测试和 release preflight

## 快速开始

```bash
npm install -D crewup-harness
npx crewup install
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
npx crewup check
```

如果已经配置模型环境，并希望基于真实项目证据进一步修正适配层，可以运行：

```bash
npx crewup inspect --ai
```

## 使用方式

命令行显式启动：

```bash
npx crewup run "使用 CrewUp 规划支付系统重构，先输出需求边界、架构方案和分阶段计划"
```

聊天窗显式启动：

```text
用 CrewUp 做：为这个大型项目设计模块边界、迁移计划和验收门禁，先不要写业务代码。
```

非显式请求仍按普通助手对话处理，不应自动进入 CrewUp 流程。

## 工作流

```text
doctor -> install -> inspect -> init -> check -> run -> spec-freeze
  -> agent-plan -> orchestrate -> gate-check -> report -> finish
```

常用命令：

| 命令 | 作用 |
| --- | --- |
| `npx crewup doctor` | 检查运行环境和前置条件 |
| `npx crewup install` | 把 CrewUp 模板安装到目标项目 |
| `npx crewup inspect --no-ai` | 基于文件系统识别项目结构 |
| `npx crewup init --agent codex --yes` | 生成项目适配层和执行环境配置 |
| `npx crewup check` | 校验核心配置、脚本和模板 |
| `npx crewup run "..."` | 创建并准备一次正式 run |
| `npx crewup run --dry-run "..."` | 只查看分流结果，不创建 run |
| `npx crewup agent-plan <run-id>` | 生成 native 子 agent 计划或 bridge handoff |
| `npx crewup gate-check <run-id>` | 检查质量门禁、产物归属和越权风险 |
| `npx crewup report <run-id>` | 生成结构化交付报告 |
| `npx crewup finish <run-id>` | 关闭 run 并按策略归档 |
| `npx crewup skills` | 查看已安装 skill、角色标签和外部候选 |

## 工作流类型

| Profile | 适用场景 | 约束 |
| --- | --- | --- |
| `discovery` | 新项目摸底、模块边界、技术路线探索 | 以发现和规划为主，不直接进入实现 |
| `plan_only` | 用户明确要求只规划、不写代码 | no-code gate 生效，禁止业务代码变更 |
| `lite` | 范围很窄但仍需正式流程的小型工程任务 | 不是 quick mode，仍保留委派和门禁 |
| `standard` | 常规跨文件工程任务 | 完整任务、上下文、执行和验证闭环 |
| `full` | 高风险、大范围、多阶段项目工作 | 更强 requirements/architect/test/review/release 门禁 |

## 执行环境

| 环境 | 模式 | 说明 |
| --- | --- | --- |
| `codex` | native | 生成 Codex 原生子 agent 任务和计划，是当前稳定主路径 |
| `claude` | bridge | 生成 handoff，由 Claude 执行并写回 `result.json` |
| `cursor` | bridge | 生成 handoff，由 Cursor 执行并写回 `result.json` |
| `trae` | bridge | 生成 handoff，由 Trae 执行并写回 `result.json` |
| `manual` | manual/bridge | 人或脚本按契约写回结果 |

Bridge 的目标是稳定交接和结果回写，不宣称所有外部工具都有相同的原生多 agent API。

## 关键目录

```text
.harness/
  AGENTS.md                # 正式项目工作入口
  orchestrator/            # 主 agent、路由和桥接协议
  config/                  # scope、workflow、model、gate、delegation、write policy
  project/                 # 目标项目适配层，由 init 生成
  runs/                    # 每次 run 的输入、任务、产物和日志
  reports/                 # 运行态报告
  knowledge/               # 可选知识层和经验沉淀
```

## 发布前验证

```bash
npm run harness:check
npm test
npm run test:pack-install
npm run release:preflight
```

`test:pack-install` 会把当前包打成 tarball，在临时空项目里安装后执行 `crewup install -> inspect -> init -> check -> run --dry-run -> run -> report`，用于验证真实开发者安装路径。

## Skill 增强

安装到目标项目后，使用 CLI 命令管理可选 skill：

```bash
npx crewup skills
npx crewup skills:install
npx crewup skills:resolve
npx crewup skills:install-exact
```

`skills.yaml` 是角色 skill 标签和外部候选目录，不代表 skill 已安装。普通用户通常只需要 `npx crewup skills` 查看报告，再按需执行 `npx crewup skills:install`。

## 更多文档

| 文档 | 内容 |
| --- | --- |
| [工作流](./docs/harness-workflow.md) | 命令流程、profile 和 run 生命周期 |
| [Universal Agent Bridge](./docs/universal-agent-bridge.md) | 外部 agent handoff 和 result JSON 契约 |
| [Agent 选择](./docs/harness-agent-selection.md) | 初始化时的 agent 选择和适配层生成 |
| [Agent 能力矩阵](./docs/harness-agent-capabilities.md) | 支持等级、能力边界和声明规则 |
| [核心边界](./docs/harness-core-boundary.md) | 可复用核心、项目适配层和运行态目录边界 |
| [迭代记录](./docs/harness-workflow-iteration-plan.md) | 本轮严格工作流优化的设计和变更记录 |
| [扩展指南](./docs/harness-extension-guide.md) | skills、policies、rules、templates 扩展方式 |

## 边界

CrewUp 不替代你的构建系统、测试框架、CI/CD、业务架构或团队规范。它提供的是 AI 协作和交付闭环协议。真实项目仍应保留自己的 README、测试命令、发布流程和代码规范；CrewUp 会在初始化和运行过程中读取并引用这些信息。
