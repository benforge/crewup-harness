# Harness Agent 规则

这些规则定义可复用的工作流层。它们刻意保持项目无关：默认不假设 `apps/`、`packages/`、`docs/product/`、具体框架、语言或业务目录。

## 核心模型

- `.harness/config/` 定义工作流、委派、风险、模型、文档和质量策略。
- `.harness/orchestrator/` 定义主 agent 如何路由任务并协调子 agent。
- `.harness/agents/` 和 `.harness/rules/` 定义各角色行为。
- `.harness/templates/` 定义运行产物模板。
- `.harness/scripts/` 提供初始化、创建 run、状态流转、报告、检查、知识刷新和归档提交等 CLI 命令。
- `.harness/project/` 是 `npm run harness:init` 在目标项目内生成的项目适配层。
- `.harness/runs/`、`.harness/backlog/`、`.harness/reports/`、`.harness/dashboard/`、`.harness/knowledge/` 是运行态和状态目录。

## 默认路由

- 简单解释、状态查看、只读检查和很小的 harness 文档修补，可以由主 agent 直接处理。
- 正式项目工作应进入 harness 工作流：新功能、迭代、需求、架构、实现、测试、评审、发布摘要或项目决策。
- 常规闭环路径是：

```text
intake -> requirements_plan -> requirements_confirm -> plan -> implement -> verify -> review -> release -> done
```

- 使用能闭环的最小工作流 profile。
- 当存在风险、歧义、跨模块影响、数据变更、认证/安全、部署、删除或生产配置时，需要升级处理。

## 委派规则

- 主 agent 负责协调工作、创建或选择 run、准备任务、启动子 agent、收集结果、运行门禁并汇总。
- 开发类工作交给实现角色：`frontend`、`backend`、`database`、`devops`，必要时包括 `tester`。
- 规划和质量角色通常不直接写业务代码：`pm`、`requirements`、`architect`、`reviewer`、`release`。
- 如果原生子 agent 工具不可用，需要在 run 中记录 fallback，并停在协调/报告层。fallback 不授权主 agent 悄悄完成正式实现工作。

## 项目适配层

每个目标项目都应生成自己的适配层：

```bash
npm run harness:inspect -- --no-ai
npm run harness:init
```

适配层负责记录项目专属事实：

- 包管理器
- 使用语言
- 标准命令
- 模块
- 业务路径
- 受保护路径
- 影响范围
- 可选的长期文档目录
- 项目 overlay 规则

可复用 harness 不应硬编码特定项目结构。无论目标项目是 web/admin/backend、Unity、Python、C++、services、libraries，还是单根应用，都应由适配层在检查后描述真实结构。

## Skills 分层

- `.harness/config/skills.yaml` 是 skill 目录和调度规则，只记录角色映射、候选 skill、安装命令和使用条件。
- `.harness/skills/*.md` 是 Harness 内部 SOP，只用于 build、test、ui-verify、release-check 等工作流步骤。
- `.agents/skills/<skill-name>/SKILL.md` 是项目级 skill，适合这个项目必须共享、必须随仓库迁移的能力。
- `%USERPROFILE%/.codex/skills/<skill-name>/SKILL.md` 是用户全局 skill，适合个人跨项目复用能力。
- `.cursor`、Claude 等目录可以作为各工具自己的适配层，但不作为 Harness 的主真源。

agent 使用 skill 前必须区分“已安装能力”和“候选引用”。只有已验证 active 的 skill 才能按工具能力调用；未验证的 skill 只能作为普通文档上下文参考。

## 产物

- 需求草稿、架构方案、实施计划、测试报告、评审报告、发布摘要、阻塞记录和子 agent 日志，写入 `.harness/runs/<run-id>/`。
- 长期项目文档是可选能力。只有目标项目启用，并且用户确认 release/archive 同步后，才生成或同步。
- 面向用户的最终汇总应客观呈现。子 agent 结果优先使用表格：

| Agent | 状态 | 关键输出 | 文件/产物 | 检查 | 阻塞 |
| --- | --- | --- | --- | --- | --- |
| `frontend` | completed | 简短事实摘要 | 路径 | 命令/结果 | 无 |

## 完成条件

正式 run 只有在必需门禁通过，或阻塞原因已记录后，才算闭环：

```bash
npm run harness:report -- <run-id>
npm run harness:next -- <run-id>
npm run harness:gate-check -- <run-id>
```

启用归档提交时，最终汇总必须说明提交是已创建、已跳过、被阻塞还是失败。
