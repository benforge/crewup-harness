# CrewUp

中文 | [English](./README.en.md)

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp 是一套面向大型、正式工程项目的 AI harness。它不负责替代某个 agent 写代码，而是把“什么时候进入流程、谁生成什么产物、谁执行实现、哪些门禁必须通过、最终如何归档”变成一套可复用、可检查、可追踪的工作流。

它的产品定位是“AI 团队协作控制层”：主 agent 不再无限扩张成万能执行者，而是像交付负责人一样创建 run、拆分任务、分配上下文、等待子 agent 结果、检查产物归属和质量门禁。真正的需求、架构、实现、测试、审查、文档和发布摘要，由对应角色 agent 或外部执行者完成。

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

一次正式 run 会被拆成三层：

| 层级 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| 主 agent | 判断是否进入 CrewUp、选择 profile、创建 run、分配任务、检查 gate、汇总状态 | 不直接写正式业务实现，不替 requirements/architect/tester/reviewer/docs/release 生成主要产物 |
| 子 agent / 外部执行者 | 按角色生成产物、实现变更、测试验证、审查风险、写回结果 | 不绕过 run 状态、产物归属和写入范围 |
| Harness 门禁 | 校验显式 opt-in、阶段流转、artifact provenance、反馈修复、服务关闭和归档条件 | 不替代项目自己的测试、构建、CI/CD 或业务规范 |

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
| `npx crewup dashboard` | 生成或刷新 `.harness/dashboard/index.html` |
| `npx crewup skills` | 查看已安装 skill、角色标签和外部候选 |
| `npx crewup dev-service <run-id> start` | 为当前 run 启动项目 dev/preview 服务并记录 pid |
| `npx crewup dev-service <run-id> stop` | 停止当前 run 启动的服务，避免归档后残留进程 |

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

## 反馈与预览服务

Tester 或 reviewer 发现问题时，主 agent 只负责把反馈转派给对应实现 agent，不直接修改业务代码。反馈结果会通过 `fixRequired`、`targetAgents` 和 `requiredFixes` 字段进入后续修复循环。

需要给用户查看运行效果时，可以按 run 启动服务：

```bash
npx crewup dev-service <run-id> start
npx crewup dev-service <run-id> status
npx crewup dev-service <run-id> stop
```

`finish` / `done` 前如果服务仍在运行，门禁会阻止归档，避免遗留进程。

## Dashboard 什么时候生成

`.harness/dashboard/` 目录默认存在，是为了保留运行态 dashboard 的位置。真正的页面文件是：

```text
.harness/dashboard/index.html
```

它会在这些时候生成或刷新：

- 运行 `npx crewup dashboard`
- `orchestrate` 写入运行态状态时自动刷新
- `finish <run-id>` 推进到 `done` 时自动刷新

如果你只创建了 run，但没有执行 `orchestrate`，也还没有 `finish` 到 done，那么 dashboard 目录里可能只有 `.gitkeep`，这是正常的。

## Docs Agent 什么时候启动

`docs` 不是每个 run 都固定启动的 agent。它只在“文档是交付物”或“实现改变了用户需要知道的东西”时启动。

这些请求会触发 `docs`：

```bash
npx crewup run "更新 README，补充安装和启动说明，不改源码"
npx crewup run "实现登录功能，并同步更新接入说明和配置说明"
npx crewup run "新增公开 API，补充接口文档和迁移说明"
npx crewup run "调整启动命令和部署步骤，需要更新开发指南"
```

通常触发信号包括：

- README、docs、文档、使用说明、接入说明、配置说明、开发指南、安装说明
- 公开 API、配置方式、启动命令、部署步骤、迁移说明
- 用户可见行为变化，需要给使用者或维护者留下说明

如果只是内部实现修复，没有文档影响，`docs` 可以不启动；这时由 `release` agent 在 `release-summary.md` 里记录“无文档变更”。`release` 负责发布摘要，`docs` 负责 README/docs 等项目文档，它们不是同一个角色。

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
