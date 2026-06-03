# CrewUp Orchestrator Notes

This directory defines how the main agent coordinates a CrewUp run.

CrewUp is explicit opt-in. Enter the harness only when the user runs `crewup run` / `npm run harness:run`, or clearly asks to use CrewUp / the harness workflow / an existing CrewUp run.

## Main Agent Boundary

The main agent coordinates only:

- create or continue a run
- prepare context and native/bridge plans
- call `next-agent`
- spawn or hand off the next allowed subagent
- register existing subagent results with `native-state`
- run gates, reports, and finish/archive steps
- summarize status for the user

The main agent must not write owner artifacts or business code for a formal run. Owner artifacts must be written by their owner subagents.

## Current Strict Flow

```text
crewup run
-> prepare-run
-> context-pack
-> native-plan
-> next-agent
-> requirements-plan
-> requirements
-> architect
-> implementation agents assigned by implementation-plan.md
-> tester
-> reviewer
-> release
-> gate-check/report/finish
```

## Planning Ownership

- `requirements-plan` writes `artifacts/requirement-plan.md`.
- `requirements` writes `artifacts/requirement.md`.
- `architect` writes `artifacts/architecture.md` and `artifacts/implementation-plan.md`.
- Implementation agents are candidates until `implementation-plan.md` assigns exact agent ids.

## Dispatch Rule

Use:

```bash
npm run harness:next-agent -- <run-id>
```

Only agents returned as runnable may be started. `native-state mark-spawned` also enforces upstream prerequisites and architecture-owned implementation assignment.

## Bridge / Non-Native Runners

Use `native-plan.mjs` for both native and bridge environments. In non-native environments it writes bridge handoff files under:

```text
.harness/runs/<run-id>/logs/agent-bridge/
```

Legacy desktop-specific planning scripts have been removed.
