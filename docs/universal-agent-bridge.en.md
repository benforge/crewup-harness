# Universal Agent Bridge

[中文](./universal-agent-bridge.md) | English

CrewUp keeps Codex as the stable native path and uses the Universal Agent Bridge for Claude, Cursor, Trae, and manual execution.

The bridge is not a claim that every tool has the same native multi-agent API. It is a stable handoff and result-writeback contract.

## Authentication

CrewUp does not authenticate Claude, Cursor, Trae, or other external tools. Each tool uses its own login state, API key, subscription, local CLI, or editor integration.

The bridge path is still useful because CrewUp owns:

- the run directory
- the role task
- the context pack
- the result JSON schema
- the gate checks

The external tool owns execution. After execution, the result must be written back before CrewUp can trust the work.

## Design Goal

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

## What Stays Stable

- `.harness/config/model-policy.yaml` remains the native/Codex model policy.
- `.harness/project/agent.yaml` records the selected execution environment.
- `.harness/runs/<run-id>/tasks/*.task.md` remains the role task source.
- `.harness/runs/<run-id>/logs/context/*.md` remains the context pack.
- `.harness/runs/<run-id>/logs/agent-bridge/*.result.json` is the external result contract.

## Runtime Modes

| Mode | Agent | Automation Level | Result Source |
| --- | --- | --- | --- |
| `native` | Codex | Highest | Codex native subagent result |
| `bridge` | Claude / Cursor / Trae | Medium | External tool writes `result.json` |
| `manual` | Human or shell workflow | Low but reliable | Human writes `result.json` |

## Bridge Files

After a run has tasks and context, run:

```bash
npx crewup agent-plan <run-id>
```

For `claude`, `cursor`, `trae`, or `manual`, CrewUp writes:

```text
.harness/runs/<run-id>/logs/agent-bridge/
  bridge-manifest.json
  bridge-manifest.md
  bridge-state.json
  <agent>.handoff.md
  <agent>.result.json   # created by the external agent or user
```

## Result JSON Contract

Each external agent must write:

```json
{
  "agent": "frontend",
  "status": "completed",
  "summary": "What was completed.",
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
  "handoff": "Next step for the main agent."
}
```

`artifactUpdates` feeds the provenance gate: every primary artifact should include the artifact name, path, owner, and action. `artifactsUpdated` remains as a lighter path list for older tools or manual writeback.

When the result repairs or supersedes an earlier result, fill:

- `repairOf`: issue ids or previous result paths being repaired
- `repairReason`: why the repair was needed
- `previousResultPath`: the earlier result JSON path, when known

Valid `status` values:

- `completed`
- `blocked`
- `needs_input`

## External Tool Flow

1. Generate or select a run.
2. Generate tasks and context.
3. Generate the agent plan.
4. Open the generated `<agent>.handoff.md` in Claude, Cursor, Trae, or another tool.
5. Let the tool perform the task.
6. Write the final JSON to `<agent>.result.json`.
7. Run `npx crewup orchestrate <run-id>` to collect and apply the structured result.
8. Continue with `gate-check`, `report`, and `finish`.

## Why This Is More Mature

- Codex native execution is not weakened by experimental adapters.
- External tools do not need identical APIs.
- Open-source users can adopt the workflow with any agent tool.
- Better adapters can be added later without changing the core run format.

## Support Claims

Use precise language:

- Good: "Codex-native workflow with a universal bridge for Claude, Cursor, Trae, and manual execution."
- Avoid: "Full native Claude/Cursor/Trae multi-agent support."

An adapter should only be called native after it can repeatedly:

```text
install -> inspect -> init -> run -> execute agents -> collect results -> gate-check -> finish
```
