# Universal Agent Bridge

中文 | [English](./universal-agent-bridge.en.md)

CrewUp 保持 Codex native 作为稳定主路径，同时用 Universal Agent Bridge 接入 Claude、Cursor、Trae 和人工执行。

Bridge 不宣称所有工具都有相同的原生多 agent API。它是一套稳定的任务交接和结果写回契约。

## 认证方式

CrewUp 不负责认证 Claude、Cursor、Trae 或其他外部工具。每个工具使用自己的登录态、API key、订阅、本地 CLI 或编辑器集成。

Bridge 路径仍然有价值，因为 CrewUp 负责：

- run 目录
- 角色任务
- context pack
- result JSON schema
- gate 检查

外部工具负责执行。执行完成后，必须把结果写回，CrewUp 才能把这次工作视为可信证据。

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
  "repairOf": [],
  "repairReason": "",
  "previousResultPath": "",
  "blockers": [],
  "handoff": "给主 agent 的下一步交接。"
}
```

`artifactUpdates` 用于 provenance gate：每个主要产物都应写明产物名、路径、owner 和动作。`artifactsUpdated` 保留为较轻的路径列表，方便旧工具或人工写回。

当结果是在修复旧结果时，填写：

- `repairOf`: 被修复的问题 id 或旧 result 路径
- `repairReason`: 为什么需要修复
- `previousResultPath`: 上一个 result JSON 路径

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

## 支持声明

建议使用精确表述：

- 推荐：`Codex-native workflow with a universal bridge for Claude, Cursor, Trae, and manual execution.`
- 避免：`Full native Claude/Cursor/Trae multi-agent support.`

只有当适配器可以稳定通过下面闭环后，才应称为 native：

```text
install -> inspect -> init -> run -> execute agents -> collect results -> gate-check -> finish
```
