# Agent Capabilities

CrewUp supports a stable workflow core and a pluggable agent adapter layer.

An adapter is not considered native until it can launch work, collect results, and write back state in a repeatable way.

## Capability Matrix

| Agent | Support Level | Mode | Native Subagents | Parallel Subagents | Result Writeback | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `codex` | native | native | yes | yes | yes | Uses Codex-style native or CLI-backed workflow where available |
| `claude` | experimental | bridge | no | no | adapter-required | Requires a Claude Code bridge that writes CrewUp result files |
| `cursor` | experimental | bridge | no | no | adapter-required | Requires a Cursor bridge or manual task/result handoff |
| `trae` | experimental | bridge | no | no | adapter-required | Requires a Trae bridge or manual task/result handoff |
| `manual` | fallback | manual | no | no | manual-writeback | Generates tasks and prompts; humans or external tools write back results |

## Native Mode

Native mode means the adapter can:

- launch a worker
- pass a scoped task prompt
- collect completion status
- collect result files or structured output
- write back to `.harness/runs/<run-id>/`
- participate in verification and finish gates

## Bridge Mode

Bridge mode means CrewUp owns the workflow state, but an external tool must execute the generated task or prompt.

The bridge must write results back into CrewUp artifacts before `gate-check` and `finish` can be trusted.

## Manual Mode

Manual mode is not an agent. It is a fallback path for teams that want CrewUp's workflow, reports, and gates without an automated agent runner.

## Rule

Do not claim full support for an agent environment unless its adapter has been tested through:

```text
install -> inspect -> init -> run -> verify -> report -> finish
```
