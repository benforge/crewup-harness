# Agent 选择与适配层方案

中文 | [English](./harness-agent-selection.en.md)

CrewUp 不应该把某一个 agent 产品硬编码成唯一执行路径。更成熟的默认方案是：

```text
Codex native path + Universal Agent Bridge for everything else
```

Codex 是当前稳定主路径。Claude、Cursor、Trae 和人工流程通过 bridge 接入，除非未来某个适配器完成端到端 native 验证。

## 目标

让用户在 `crewup init` 时选择执行环境，然后只生成匹配的适配层。

## 推荐交互

1. 运行 `crewup init`。
2. 显示精简 agent 列表：Codex、Claude、Cursor、Trae、Manual。
3. 用户用上下键选择，默认选中 Codex。
4. 生成共享 harness 核心和对应适配层。

## 如何选择环境

- 选择 `codex`：希望使用当前最稳定路径，并且 Codex 环境可以启动 native 子 agent。
- 选择 `claude`、`cursor`、`trae`：希望 CrewUp 为外部工具生成 handoff 和 result contract。
- 选择 `manual`：希望保留 CrewUp 的严格任务、gate 和报告，但不自动执行 AI agent。

被选择的环境仍然需要它自己的认证方式。CrewUp 不提供 API key 或订阅。

## 非交互模式

`crewup init --agent <name>` 会跳过交互选择，直接使用指定 agent。

CI、脚本或全新空项目中推荐：

```bash
npx crewup init --agent codex --yes
```

如果只使用 `crewup init --yes` 或 `crewup init --no-interactive`，CrewUp 默认选择 `codex` 并打印明确提示。

## 推荐 agent 名称

| 名称 | 含义 |
| --- | --- |
| `codex` | OpenAI Codex 风格执行环境 |
| `claude` | Claude bridge 工作流 |
| `cursor` | Cursor bridge 工作流 |
| `trae` | Trae bridge 工作流 |
| `manual` | 人工 prompt handoff 和 shell-only 兜底 |

## 分层规则

- 共享工作流文件保持可复用。
- agent 专属启动、prompt、生命周期文件放在适配层。
- 不支持的能力必须优雅降级，不能中断核心工作流。
- `model-policy.yaml` 保持 native/Codex 导向；外部工具自行管理模型选择。
- Bridge 适配器必须写回 CrewUp 兼容的 `result.json`，门禁结果才可信。

## 输出规则

初始化后，CrewUp 应始终报告：

- 检测到的项目结构
- 选择的 agent
- 生成的共享文件
- 生成的适配器文件
- 检测不确定时的人工复核建议

## 稳定性规则

Agent 选择是用户界面和适配层选择。即使某个适配器变化或不可用，工作流核心也必须保持稳定。

当前支持矩阵见 [harness-agent-capabilities.md](./harness-agent-capabilities.md)。Bridge 协议见 [universal-agent-bridge.md](./universal-agent-bridge.md)。
