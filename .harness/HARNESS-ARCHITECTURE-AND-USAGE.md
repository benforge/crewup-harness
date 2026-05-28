# Harness 架构与使用方式

这个仓库是一套可复用 harness 模板。harness 不是产品应用，也不要求固定使用 `apps/`、`packages/` 或 `services/` 这类目录。

## 目录职责

| 路径 | 职责 | 可移植性 |
| --- | --- | --- |
| `.harness/config/` | 工作流、委派、风险、模型、文档和质量策略 | 可复用 |
| `.harness/orchestrator/` | 主 agent 路由和原生子 agent 指引 | 可复用 |
| `.harness/agents/` | 角色提示词和职责 | 可复用 |
| `.harness/rules/` | 角色级规则 | 可复用 |
| `.harness/templates/` | 产物模板 | 可复用 |
| `.harness/scripts/` | CLI 实现 | 可复用 |
| `.harness/project/` | 目标项目生成的适配层 | 每个项目重新生成 |
| `.harness/runs/` | run 状态和产物 | 运行态 |
| `.harness/backlog/` | 运行态需求队列 | 运行态 |
| `.harness/knowledge/` | 生成的索引和经验 | 运行态 |
| `.harness/reports/` | 生成的报告 | 运行态 |
| `.harness/dashboard/` | 生成的 dashboard 输出 | 运行态 |

## 核心原则

可复用 harness 定义“工作如何流转”。目标项目适配层定义“这个项目长什么样”。

这个分离让模板可以用于 web、后端、管理端、C++、Python、Unity、monorepo 或单根项目。

## 目标项目设置

把 `.harness/` 和根目录脚本复制到项目后，运行：

```bash
npm install
npm run harness:inspect -- --no-ai
npm run harness:init
npm run harness:check
```

可选的 AI 辅助适配层生成：

```bash
npm run harness:inspect -- --ai
npm run harness:init -- --force
```

生成的适配层位于：

- `.harness/project/profile.yaml`
- `.harness/project/overlay.yaml`
- `.harness/project/rules/`

这些文件允许在不同目标项目中不同。

## 运行流程

正式需求使用：

```bash
npm run harness:run -- "<用户需求>"
```

闭环路径是：

```text
intake -> requirements_plan -> requirements_confirm -> plan -> implement -> verify -> review -> release -> done
```

每个 run 的状态保存在：

```text
.harness/runs/<run-id>/
  input.md
  state.json
  tasks/
  artifacts/
  logs/
```

## 文档策略

规划草稿保存在 `.harness/runs/<run-id>/artifacts/`。

长期项目文档是可选的。如果目标项目需要，需在 `.harness/project/profile.yaml` 中启用 `project_profile.product_docs.sync.enabled` 并配置路径。产品文档只应在 release 检查后，并经用户确认后同步。

## Git 归档

归档提交行为由以下内容控制：

- `.harness/config/archive-policy.yaml`
- `npm run harness:archive-commit -- <run-id>`

最终汇总必须说明提交状态是 `committed`、`skipped`、`blocked` 还是 `failed`。

## 结果呈现

当子 agent 参与时，主 agent 应客观呈现结果：

| Agent | 状态 | 关键输出 | 文件/产物 | 检查 | 阻塞 |
| --- | --- | --- | --- | --- | --- |
| `backend` | completed | 简短事实摘要 | 路径 | 命令/结果 | 无 |

这张表应基于原生状态、结果文件、run 报告和 artifacts，而不是只凭记忆。
