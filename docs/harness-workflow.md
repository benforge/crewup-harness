# Harness 工作流

中文 | [English](./harness-workflow.en.md)

CrewUp 的工作流默认是显式 opt-in。没有明确的 CrewUp/harness/run 信号时，聊天窗仍然是普通助手对话；一旦进入 CrewUp，就执行严格闭环，主 agent 只负责调度、委派、门禁和汇总。

## 产品模型

CrewUp 把一次 AI 工程工作拆成“运行态、角色产物、门禁”三件事：

- 运行态：每个正式需求都会进入 `.harness/runs/<run-id>/`，保存输入、状态、任务、上下文包、子 agent 结果和报告。
- 角色产物：requirements、architect、builder、tester、reviewer、docs、release 分别拥有自己的交付物，主 agent 只负责路由和验收。
- 门禁：进入下一阶段前，必须检查 stage gate、artifact provenance、反馈修复、no-code profile、服务关闭和归档条件。

这让 CrewUp 更像大型项目的 AI delivery harness，而不是一个自动写代码的快捷命令。

## 主流程

```text
doctor -> install -> inspect -> init -> check -> run -> spec-freeze
  -> agent-plan -> orchestrate -> gate-check -> report -> finish
```

## 每一步做什么

| 步骤 | 作用 | 主要输出 |
| --- | --- | --- |
| `doctor` | 前置环境检查 | 环境和能力报告 |
| `install` | 把可复用核心复制到目标仓库 | `.harness/`、`AGENTS.md`、runtime ignore |
| `inspect` | 发现真实项目结构 | `.harness/project/inspect.json`、适配建议 |
| `init` | 生成项目适配层和执行环境配置 | `.harness/project/*` |
| `check` | 校验 harness 安装 | 配置、脚本、模板和边界检查 |
| `run` | 启动一次正式工作流或 dry-run 分流 | run 状态、任务、上下文包、token ledger |
| `spec-freeze` | 固化短需求摘要 | `artifacts/spec-freeze.md`、`logs/spec-freeze.json` |
| `agent-plan` | 生成 Codex native 计划或 bridge handoff | native plan 或 `logs/agent-bridge/*` |
| `orchestrate` | 收集 native/bridge/manual 结果 | agent 日志、产物更新和状态 |
| `gate-check` | 检查完成条件、产物归属和越权风险 | 质量门禁通过/失败 |
| `report` | 汇总交付状态 | 结构化 Markdown 报告 |
| `finish` | 关闭本次工作流 | 已关闭 run 和可归档输出 |

## Profile 分流

| Profile | 什么时候启用 | 关键规则 |
| --- | --- | --- |
| `discovery` | 用户要求摸底、目录结构、模块边界、技术路线 | 先发现和规划，不直接实现 |
| `plan_only` | 用户明确说只规划、不写代码、不改业务代码 | no-code gate 生效，业务代码变更会被拦截 |
| `lite` | 范围窄但仍是正式工程任务 | 不是快速模式，仍需任务、委派和门禁 |
| `standard` | 常规实现或跨文件修改 | 完整闭环 |
| `full` | 高风险、大范围、多阶段工作 | 更强 requirements、architect、tester、reviewer、release 门禁 |

可以先用 dry-run 查看分流：

```bash
npx crewup run --dry-run "使用 CrewUp 先规划一个大型系统的模块边界和技术路线，不写代码"
```

## Run 命名

Run ID 使用“日期 + 序号 + 语义 slug”。CrewUp 会优先从用户需求中提取动作和对象，例如：

```text
plan-fullstack-blog-system
improve-readme
fix-auth
```

这避免把完整中文需求截断成难读目录名。若无法识别语义，才回退到标题 slug。

## Artifact Schema 前置

每个子 agent task 会包含自己负责 artifact 的 schema，例如 owner、required headings 和 forbidden terms。以 `requirements-plan` 为例，task 会明确要求：

```text
原始需求摘要
过往背景
目标
非目标
验收标准
影响范围候选
待确认问题
```

这样要求在写作前就进入子 agent 上下文，减少 gate-check 后逐项返工。

## 模型策略

正式规划产物不使用最低档：

| 角色 | 产物 | 默认模型 |
| --- | --- | --- |
| `requirements-plan` | `requirement-plan.md` | `gpt-5.4-mini` / medium |
| `requirements` | `requirement.md` | `gpt-5.5` / medium |
| `architect` | `architecture.md`、`implementation-plan.md` | `gpt-5.5` / medium |

## 子 agent 何时启用

| 子 agent | 典型启用时机 | 产物归属 |
| --- | --- | --- |
| `pm` | 高风险、跨团队或需要产品取舍的 full run | 需求背景、优先级和产品约束 |
| `requirements-plan` | 大型、模糊或多阶段需求，需要先扩写和收敛 | requirement-plan |
| `requirements` | 需求不完整、范围不清、需要验收标准 | requirement |
| `architect` | 结构设计、跨模块变更、技术路线、迁移计划 | architecture / implementation-plan |
| `backend`、`frontend`、`database`、`devops` | 对应领域需要实现或配置变更 | 领域实现结果和交接 |
| `tester` | 需要测试策略、测试补齐或验证记录 | test-report |
| `reviewer` | 需要质量、安全、回归风险检查 | review-report |
| `docs` | 文档、说明、迁移指引 | docs artifact |
| `release` | 发布准备、变更摘要、归档 | release-summary |

主 agent 可以准备 run、创建任务、分配上下文、检查门禁和汇总状态，但不应直接生成 requirements/architecture 等主要产物，也不应在有实现类 agent 可用时直接完成业务代码实现。

## 规划型 run 的顺序和产物归属

对于“规划全栈博客系统，当前阶段只做需求澄清、技术选型建议、目录结构设计、模块边界、开发阶段拆分和验收标准，不写业务代码”这类请求，正常流程是：

1. `crewup run` 只创建 run、冻结输入、准备任务和 native subagent plan。
2. 主 agent 先启动 `requirements-plan`，并等待它写入 `artifacts/requirement-plan.md`。
3. `requirements-plan` 的结果被 `native-state` 捕获后，主 agent 才能启动 `requirements` 写入 `artifacts/requirement.md`。
4. `requirements` 完成后，主 agent 才能启动 `architect` 写入 `artifacts/architecture.md` 和 `artifacts/implementation-plan.md`。
5. `reviewer` 最后检查规划产物和验收标准。

这些正式 artifact 必须由对应 owner 子 agent 写入。主 agent 不应把子 agent 返回的正文粘贴到 artifact 文件里；如果 owner 子 agent 没有写成功，应要求它返修或把本轮标记为 `blocked` / `needs_input`。

## 执行路径

| 选择的 agent | 路径 | 行为 |
| --- | --- | --- |
| `codex` | native | CrewUp 生成原生子 agent prompt 和计划，由 Codex 执行。 |
| `claude` | bridge | CrewUp 写 handoff 文件，Claude 写回 `result.json`，CrewUp 收集。 |
| `cursor` | bridge | CrewUp 写 handoff 文件，Cursor 写回 `result.json`，CrewUp 收集。 |
| `trae` | bridge | CrewUp 写 handoff 文件，Trae 写回 `result.json`，CrewUp 收集。 |
| `manual` | bridge/manual | 人或脚本按契约写回 `result.json`，CrewUp 收集。 |

## 自测闭环

```bash
npm run test:pack-install
npm run release:preflight
```

`test:pack-install` 会把当前包打成 tarball，在临时项目中验证安装、inspect、init、check、profile dry-run、正式 run 和 report。`release:preflight` 会叠加核心检查、示例测试、pack-install 和 `npm pack --dry-run`。

## 闭环规则

每个正式 run 最后都应该留下：

1. 结构化报告
2. 验证记录
3. 子 agent 交接或 result JSON
4. 清楚的完成、阻塞或归档状态
