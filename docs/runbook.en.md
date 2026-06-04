# CrewUp Runbook

[中文](./runbook.md) | English

Use this runbook to decide whether a CrewUp run is healthy, complete, blocked, or ready to continue. It is written for real users, not only harness maintainers.

## Where To Look First

Every formal task is a run:

```text
.harness/runs/<run-id>/
```

Read these files first:

| File | Purpose |
| --- | --- |
| `RUN_STATUS.md` | Current status, owner, next step, blockers, progress |
| `RUN_SUMMARY.md` | Archive summary reusable by later runs |
| `logs/run-report.md` | Delivery report for this run |
| `.harness/reports/<run-id>.md` | Global report copy |
| `logs/archive/archive-summary.md` | Archive reason and outcome |

Useful commands:

```bash
npx crewup status
npx crewup status <run-id>
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

## What Healthy Looks Like

A healthy run should satisfy:

- `RUN_STATUS.md` exists and shows status, stage, owner, and next command.
- If the current directory is a Git repository, the run attempts to create a `crewup/<run-id>-<slug>` branch; pre-existing uncommitted files are recorded in `state.json` under `git.dirtyAtStart`.
- The initial `next-agent` result only allows `requirements-plan`.
- `requirements` waits until `requirements-plan` completes.
- `architect` waits until `requirements` completes.
- Implementation agents are candidates only until `implementation-plan.md` assigns exact agent ids.
- tester/reviewer required fixes go back to the owner implementation agent.
- The main agent creates runs, calls `next-agent`, registers results, and runs audit/gate/report. It does not write owner artifacts or business code.

Normal order:

```text
requirements-plan
  -> requirements
  -> architect
  -> implementation agents assigned by implementation-plan.md
  -> tester
  -> reviewer
  -> release
```

## What Is Not Healthy

Pause and fix orchestration if you see:

- `requirements` and `architect` starting in parallel.
- An implementation agent starting before `requirements-plan`.
- frontend/backend/database/devops/docs starting without `implementation-plan.md`.
- The main agent directly editing business code after tester/reviewer feedback.
- The main agent copying subagent output into `requirement.md`, `architecture.md`, `test-report.md`, or another owner artifact.
- Subagent results not registered in native-state or bridge result JSON.
- `RUN_STATUS.md` does not show a clear next action.
- The chat window contains full logs, full context packs, or full subagent conversations.

## What Complete Means

Successful completion requires all of these:

- `state.status` is `done`.
- `outcome` is `success`.
- Owner artifacts were produced by the owning agents.
- tester/reviewer issues were handled or explicitly closed.
- `audit` and `gate-check` pass.
- `report` was generated.
- Any dev service started by the run is stopped or has shutdown evidence.
- `RUN_STATUS.md` shows done and report/archive evidence exists.

Recommended commands:

```bash
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
npx crewup finish <run-id>
```

`finish` is the success closeout path. Archive alone does not mean success unless `outcome=success`.

## When A Run Is Blocked

Start with:

```bash
npx crewup status <run-id>
npx crewup native-state <run-id> diagnose
npx crewup audit <run-id>
```

Common handling:

| Situation | Action |
| --- | --- |
| Waiting for user confirmation | `npx crewup clarify <run-id> --interactive` |
| Subagent has no result | Resume that agent, or write bridge/manual result JSON |
| Owner artifact is invalid | Resume the owner agent; do not let the main agent rewrite it |
| tester/reviewer requires fixes | Use `repair-plan` to assign owner implementation agents |
| Local dependency/environment unavailable | Record blocker and archive as blocked if needed |
| Only part of the work is done | Archive as partial and continue in a later run |

## Cancel, Fail, Or Partial

Do not leave runs hanging. Non-success outcomes still need closeout:

```bash
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable"
npx crewup archive <run-id> --outcome=partial --reason="frontend done, backend blocked"
npx crewup archive <run-id> --outcome=failed --reason="tests cannot run in this environment"
npx crewup cancel <run-id> --reason="scope changed"
```

Archive creates:

- `RUN_SUMMARY.md`
- `logs/archive/archive-summary.md`
- `.harness/reports/<run-id>.md`

This makes the run reusable without relying on chat memory.

## Continue A Previous Run

If a blocked, partial, canceled, or failed run should continue:

```bash
npx crewup continue <source-run-id> "Continue the unfinished work and reuse the existing requirement and architecture."
```

The new run reads the source run's:

- `RUN_STATUS.md`
- `RUN_SUMMARY.md`
- `artifacts/requirement.md`
- `artifacts/architecture.md`
- `artifacts/implementation-plan.md`

The old run is not overwritten. The continuation is a new formal work unit.

## Main Agent Reporting Standard

Main-agent status updates should stay short:

```text
Run: <run-id>
Status: active / requirements_plan
Owner: requirements-plan
Next: npx crewup next-agent <run-id>
Status card: .harness/runs/<run-id>/RUN_STATUS.md
Details: .harness/runs/<run-id>/logs/run-report.md
```

Do not paste full subagent output, full logs, or full context packs. Link to paths instead.
