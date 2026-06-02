# Agent 能力矩阵

中文 | [English](./harness-agent-capabilities.en.md)

CrewUp 由稳定的工作流核心和可插拔的 agent 适配层组成。

只有当某个适配器可以稳定地启动任务、收集结果并写回状态时，才应该被称为 native 支持。

## 产品角色边界

CrewUp 的核心不是“让一个主 agent 做完所有事”，而是把主 agent 固定在调度角色：

- 主 agent：创建 run、选择 profile、分配任务、控制上下文、检查 gate、汇总状态。
- 角色 agent：生成自己负责的正式产物，或者执行对应领域的实现、验证、审查和文档更新。
- 适配器：决定这些角色是由 Codex native 子 agent、Claude/Cursor/Trae bridge，还是 manual runner 执行。

无论使用哪种适配器，结果都必须回写到 run 状态和结果文件中，才能被 gate-check 视为可信证据。

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

## 主 agent 能力边界

主 agent 是 orchestrator，不是默认实现者。它可以：

- 判断是否进入 CrewUp
- 选择 profile 和 run type
- 创建任务、分配上下文、触发子 agent
- 检查产物 owner、provenance、stage gate
- 汇总结果、报告状态、提出下一步

它不应：

- 在 requirements/architect agent 可用时直接撰写对应正式产物
- 在实现类 agent 可用时直接承担主要业务代码实现
- 为了快而绕过 no-code、plan-only、stage-entry 或 artifact provenance gate
