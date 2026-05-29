# Harness 工作流

中文 | [English](./harness-workflow.en.md)

## 主流程

```text
doctor -> install -> inspect -> init -> check -> run -> agent-plan -> orchestrate -> gate-check -> report -> finish
```

## 每一步做什么

| 步骤 | 作用 | 主要输出 |
| --- | --- | --- |
| `doctor` | 前置环境检查 | 环境和能力报告 |
| `install` | 把可复用核心复制到目标仓库 | `.harness/` 和 `AGENTS.md` |
| `inspect` | 发现真实项目结构 | 项目证据和适配建议 |
| `init` | 生成项目适配层 | `.harness/project/*` |
| `check` | 校验 harness 安装 | 配置和脚本完整性报告 |
| `run` | 启动一次需求工作流 | run 状态和规划产物 |
| `agent-plan` | 生成 Codex native 计划或 bridge handoff | native plan 或 `logs/agent-bridge/*` |
| `orchestrate` | 收集 SDK/native/bridge 结果 | agent 日志、产物和状态 |
| `gate-check` | 检查完成条件 | 质量门禁通过/失败 |
| `repair-artifacts` | 补齐必要产物结构 | 修复后的测试、评审、发布产物 |
| `report` | 汇总交付状态 | 结构化 Markdown 报告 |
| `finish` | 关闭本次工作流 | 已关闭 run 和可归档输出 |

## 执行路径

| 选择的 agent | 路径 | 行为 |
| --- | --- | --- |
| `codex` | native | CrewUp 生成原生子 agent prompt，由 Codex 执行。 |
| `claude` | bridge | CrewUp 写 handoff 文件，Claude 写回 `result.json`，CrewUp 收集。 |
| `cursor` | bridge | CrewUp 写 handoff 文件，Cursor 写回 `result.json`，CrewUp 收集。 |
| `trae` | bridge | CrewUp 写 handoff 文件，Trae 写回 `result.json`，CrewUp 收集。 |
| `manual` | bridge/manual | 人或脚本写回 `result.json`，CrewUp 收集。 |

## 需求提法

开始一个新任务时，建议说明：

- 目标
- 范围
- 技术栈
- 约束
- 验收标准
- 哪些内容不能碰

## 示例

> 做一个博客平台，包含 C 端前台、admin 后台、API 后端和数据库层。先交付架构、目录结构、数据模型和分阶段计划，不要直接实现完整产品。

## 闭环规则

每个 run 最后都应留下：

1. 报告
2. 验证记录
3. 清晰交接
4. 归档或提交状态
