# Agent 能力矩阵

中文 | [English](./harness-agent-capabilities.en.md)

CrewUp 由稳定的工作流核心和可插拔的 agent 适配层组成。

只有当某个适配器可以稳定地启动任务、收集结果并写回状态时，才应该被称为 native 支持。

## 能力矩阵

| Agent | 支持等级 | 模式 | 原生子 agent | 并行子 agent | 结果写回 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `codex` | native | native | 是 | 是 | 是 | 稳定主路径，应与实验性适配器隔离 |
| `claude` | experimental | bridge | 否 | 否 | bridge-json | 使用生成的 handoff 文件，由 Claude 写回 CrewUp 兼容结果 |
| `cursor` | experimental | bridge | 否 | 否 | bridge-json | 使用生成的 handoff 文件，由 Cursor 写回 CrewUp 兼容结果 |
| `trae` | experimental | bridge | 否 | 否 | bridge-json | 使用生成的 handoff 文件，由 Trae 写回 CrewUp 兼容结果 |
| `manual` | fallback | manual | 否 | 否 | manual-writeback | 生成任务和提示，由人或外部工具写回结果 |

## Native 模式

Native 模式表示适配器能够：

- 启动独立执行者
- 传入受限范围的任务 prompt
- 收集完成状态
- 收集结果文件或结构化输出
- 写回 `.harness/runs/<run-id>/`
- 参与验证和完成门禁

## Bridge 模式

Bridge 模式表示 CrewUp 负责工作流状态，但外部工具负责执行生成的任务或 prompt。

在 `gate-check` 和 `finish` 可信之前，bridge 必须把结果写回：

```text
.harness/runs/<run-id>/logs/agent-bridge/<agent>.result.json
```

Bridge 模式会生成：

- `bridge-manifest.md`
- `bridge-manifest.json`
- `bridge-state.json`
- `<agent>.handoff.md`
- `<agent>.result.json`

详见 [universal-agent-bridge.md](./universal-agent-bridge.md)。

## Manual 模式

Manual 模式不是一个 agent 产品，而是兜底路径。它适合希望使用 CrewUp 的工作流、报告和门禁，但暂时没有自动化 agent runner 的团队。

## 声明规则

不要宣称某个 agent 环境已经完整支持，除非它的适配器已经通过完整闭环测试：

```text
install -> inspect -> init -> run -> verify -> report -> finish
```
