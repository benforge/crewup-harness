# Agent Capabilities

[中文](./harness-agent-capabilities.md) | English

CrewUp supports a stable workflow core and a pluggable agent adapter layer.

An adapter is not considered native until it can launch work, collect results, and write back state in a repeatable way.

## Authentication Boundary

Installing CrewUp does not install model access. The selected agent environment must already be authenticated:

- Codex native mode depends on Codex Desktop / CLI login or API-backed automation.
- `OPENAI_API_KEY` is required for SDK/API mode and `inspect --ai`.
- Claude, Cursor, and Trae use their own credentials in bridge mode.
- Manual mode does not require a model key.

CrewUp can still generate tasks, plans, audits, and gates without model access; it just cannot honestly claim that AI subagents executed the work.

## Product Role Boundary

CrewUp is not designed to let one main agent do everything. It keeps the main agent in an orchestration role:

- Main agent: creates runs, selects profiles, assigns tasks, controls context, checks gates, and summarizes state.
- Role agents: produce their owned formal artifacts or execute domain implementation, verification, review, and documentation work.
- Adapters: decide whether those roles run through Codex native subagents, Claude/Cursor/Trae bridge, or a manual runner.

Regardless of adapter, results must be written back into run state and result files before `gate-check` can treat them as trusted evidence.

## Capability Matrix

| Agent | Support Level | Mode | Native Subagents | Parallel Subagents | Result Writeback | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `codex` | native | native | yes | yes | yes | Stable primary path; keep this path isolated from experimental adapters |
| `claude` | experimental | bridge | no | no | bridge-json | Uses generated handoff files; Claude writes CrewUp-compatible results |
| `cursor` | experimental | bridge | no | no | bridge-json | Uses generated handoff files; Cursor writes CrewUp-compatible results |
| `trae` | experimental | bridge | no | no | bridge-json | Uses generated handoff files; Trae writes CrewUp-compatible results |
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

The bridge must write results back into `.harness/runs/<run-id>/logs/agent-bridge/<agent>.result.json` before `gate-check` and `finish` can be trusted.

Bridge mode produces:

- `bridge-manifest.md`
- `bridge-manifest.json`
- `bridge-state.json`
- `<agent>.handoff.md`
- `<agent>.result.json`

See [universal-agent-bridge.en.md](./universal-agent-bridge.en.md).

## Manual Mode

Manual mode is not an agent. It is a fallback path for teams that want CrewUp's workflow, reports, and gates without an automated agent runner.

## Rule

Do not claim full support for an agent environment unless its adapter has been tested through:

```text
install -> inspect -> init -> run -> verify -> report -> finish
```

## Main Agent Boundary

The main agent is an orchestrator, not the default implementer. It may:

- decide whether CrewUp is active
- choose the profile and run type
- create tasks, allocate context, and trigger subagents
- check artifact ownership, provenance, and stage gates
- summarize results, report state, and propose next steps

It should not:

- directly author formal requirements or architecture artifacts when those agents are available
- directly own primary business implementation when an implementation agent is available
- bypass no-code, plan-only, stage-entry, or artifact provenance gates for speed
