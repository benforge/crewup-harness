# Universal Agent Bridge

中文 | [English](./universal-agent-bridge.en.md)

CrewUp 保持 Codex 作为稳定 native 主路径，同时用 Universal Agent Bridge 接入 Claude、Cursor、Trae 和人工执行。

Bridge 并不宣称所有工具都有相同的原生多 agent API。它是一套稳定的任务交接和结果写回契约。

## 设计目标

```text
CrewUp core:
  intake -> run -> tasks -> context -> artifacts -> gates -> finish

Execution environments:
  codex  -> native subagents
  claude -> bridge handoff + result.json
  cursor -> bridge handoff + result.json
  trae   -> bridge handoff + result.json
  manual -> bridge handoff + result.json
```

## 保持稳定的部分

- `.harness/config/model-policy.yaml` 仍然是 native/Codex 模型策略。
- `.harness/project/agent.yaml` 记录用户选择的执行环境。
- `.harness/runs/<run-id>/tasks/*.task.md` 仍然是角色任务源。
- `.harness/runs/<run-id>/logs/context/*.md` 仍然是上下文包。
- `.harness/runs/<run-id>/logs/agent-bridge/*.result.json` 是外部结果契约。

## 运行模式

| 模式 | Agent | 自动化等级 | 结果来源 |
| --- | --- | --- | --- |
| `native` | Codex | 最高 | Codex 原生子 agent 结果 |
| `bridge` | Claude / Cursor / Trae | 中等 | 外部工具写回 `result.json` |
| `manual` | 人或 shell 流程 | 低但可靠 | 人工写回 `result.json` |

## Bridge 文件

当一个 run 已经有任务和上下文后，运行：

```bash
npx crewup agent-plan <run-id>
```

对 `claude`、`cursor`、`trae` 或 `manual`，CrewUp 会写入：

```text
.harness/runs/<run-id>/logs/agent-bridge/
  bridge-manifest.json
  bridge-manifest.md
  bridge-state.json
  <agent>.handoff.md
  <agent>.result.json   # 由外部 agent 或用户创建
```

## Result JSON 契约

每个外部 agent 必须写入：

```json
{
  "agent": "frontend",
  "status": "completed",
  "summary": "完成了什么。",
  "artifactUpdates": [
    {
      "artifact": "implementation-plan",
      "path": ".harness/runs/<run-id>/artifacts/implementation-plan.md",
      "owner": "architect",
      "action": "created"
    }
  ],
  "artifactsUpdated": [
    ".harness/runs/<run-id>/artifacts/implementation-plan.md"
  ],
  "fileChanges": [],
  "recommendedCodeChanges": [],
  "tests": ["npm test"],
  "blockers": [],
  "handoff": "给主 agent 的下一步交接。"
}
```

`artifactUpdates` 用于 provenance gate：每个主要产物都应写明产物名、路径、owner 和动作。`artifactsUpdated` 保留为较轻的路径列表，方便旧工具或人工写回。

合法 `status` 值：

- `completed`
- `blocked`
- `needs_input`

## 外部工具流程

1. 创建或选择一个 run。
2. 生成任务和上下文。
3. 生成 agent plan。
4. 在 Claude、Cursor、Trae 或其他工具里打开生成的 `<agent>.handoff.md`。
5. 让外部工具执行任务。
6. 把最终 JSON 写入 `<agent>.result.json`。
7. 运行 `npx crewup orchestrate <run-id>` 收集并应用结构化结果。
8. 继续运行 `gate-check`、`report` 和 `finish`。

## 为什么这样更成熟

- Codex native 执行不会被实验性适配器削弱。
- 外部工具不需要拥有完全相同的 API。
- 开源用户可以用任意 agent 工具接入这套工作流。
- 未来可以增加更强适配器，而不改变核心 run 格式。

## 支持声明

请使用精确表述：

- 推荐："Codex-native workflow with a universal bridge for Claude, Cursor, Trae, and manual execution."
- 避免："Full native Claude/Cursor/Trae multi-agent support."

只有当适配器可以反复通过下面闭环后，才应该称为 native：

```text
install -> inspect -> init -> run -> execute agents -> collect results -> gate-check -> finish
```
