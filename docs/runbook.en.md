# CrewUp Runbook

[中文](./runbook.md) | English

Use this runbook to decide whether a CrewUp run is healthy, complete, blocked, or ready to continue. It is written for real users, not only harness maintainers.

For command tiers, commands regular users can ignore, and the full `lite` / `strict` / `plan` / `discovery` completion definitions, use [Command And Completion Governance](./command-governance.en.md) as the source of truth.

## Where To Look First

Every formal task is a run:

```text
.harness/runs/<run-id>/
```

Read these files first:

| File | Purpose |
| --- | --- |
| `RUN_STATUS.md` | Current status, stage, owner, next step, blockers, and progress |
| `GOAL.md` | Iteration goal, success criteria, non-goals, and repair budget |
| `completion-contract.json` | Machine-readable completion contract used by gates/status/report |
| `RUN_SUMMARY.md` | Archive summary reusable by later runs |
| `logs/run-report.md` | Delivery report for this run |
| `logs/repair-plan.md` | Owner repair plan when tester/reviewer requires fixes |
| `artifacts/preview-smoke.md` | Preview URL evidence for web/full-stack runs |
| `logs/archive/archive-summary.md` | Archive reason and outcome |

Useful diagnostic and closeout commands:

```bash
npx crewup status
npx crewup status <run-id>
npx crewup explain <run-id>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup preview-smoke <run-id> --url=http://localhost:3000
npx crewup report <run-id>
```

`crewup explain <run-id>` is the diagnostic entry point. If you do not know whether the run is done, why it is stuck, or what to do next, run it first.

## Healthy Workflow

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

A healthy run should satisfy:

- `RUN_STATUS.md` exists and shows status, stage, owner, and next command.
- `GOAL.md` and `completion-contract.json` exist and define success for this iteration.
- `requirements-plan` owns clarification and requirement confirmation.
- `requirements` waits for `requirements-plan` to complete and register its result.
- `architect` waits for `requirements` to complete and register its result.
- Implementation agents only start after `implementation-plan.md` assigns exact agent ids.
- tester/reviewer required fixes route back to owner implementation agents.
- The main agent only creates runs, calls `next-agent`, dispatches subagents, registers results, runs audit/gate/report/archive, and reports paths/status.
- The main agent does not write `requirement-plan.md`, `requirement.md`, `architecture.md`, `implementation-plan.md`, test reports, review reports, or business code.

## What Is Not Healthy

Pause and fix orchestration if you see:

- `requirements` and `architect` starting in parallel.
- Implementation agents starting before `requirements-plan`.
- frontend/backend/database/devops/docs starting without `implementation-plan.md`.
- The main agent directly editing business code after tester/reviewer feedback.
- The main agent copying subagent output into owner artifacts.
- Subagent result files written but not registered in native-state.
- `RUN_STATUS.md` does not show a clear next step.
- The chat window contains full logs, full context packs, or full subagent conversations.
- A user-project business run modifies `.harness/scripts/**`, `.harness/config/**`, `.harness/orchestrator/**`, `.harness/agents/**`, or other core files.
- `npx crewup check` reports sealed core drift.

If a project run exposes a CrewUp product bug, mark the current run open blocked/partial, then fix CrewUp in the source repository, test it, and publish an upgrade. Do not patch `.harness` core scripts inside the same user-project business run.

## What Complete Means

First read `Iteration Verdict` at the top of `RUN_STATUS.md`:

| Verdict | Meaning | Successful completed iteration? |
| --- | --- | --- |
| `SUCCESS` | `status=done`, `outcome=success`, `archived=true`, with gate/report/archive evidence | Yes |
| `READY_TO_ARCHIVE` | done/success, but archive closeout is still pending | No |
| `PARTIAL` | partially complete, or contains direct-chat work outside strict owner-agent flow | No |
| `BLOCKED` | blocked by environment, dependency, tool, subagent, or workflow issue | No |
| `FAILED` | failed and should not be treated as delivery | No |
| `CANCELED` | intentionally stopped | No |
| `IN_PROGRESS` / `WAITING_USER` | still active or waiting for user input | No |

Successful completion requires all of these:

- Success criteria in `GOAL.md` / `completion-contract.json` are satisfied.
- `state.status=done`.
- `outcome=success`.
- Owner artifacts were produced by owning agents.
- tester/reviewer issues were handled or explicitly closed.
- `audit` and `gate-check` pass.
- `report` was generated.
- Web/full-stack runs report preview URLs; if a preview service was started, `preview-smoke` passed or a blocker explains why it could not pass.
- Any dev service started by the run is stopped or has shutdown evidence.
- `RUN_STATUS.md` shows success and archived.

Recommended closeout:

```bash
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup preview-smoke <run-id> --url=<preview-url>
npx crewup report <run-id>
npx crewup finish <run-id>
```

`finish` is the success closeout path. Archive alone does not mean success unless `outcome=success`.

### Lite Closeout

For `lite` runs, `finish` checks the lightweight evidence files instead of the strict native subagent gates:

- `spec.md`
- `tasks.md`
- `validation.md`
- `summary.md`

`validation.md` and `summary.md` must be updated from their pending template state. If they are still pending, `finish` exits with an error and keeps the run open.

Detailed guide: [Lite Lightweight Flow](./lite-v2.en.md).

## When A Run Is Stuck

Do not ask the main agent to guess. Run:

```bash
npx crewup explain <run-id>
npx crewup native-state <run-id> diagnose
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

Common handling:

| Situation | Action |
| --- | --- |
| You do not know where the run is or why it is stuck | Run `npx crewup explain <run-id>` first and follow `Next Steps` |
| Waiting for user confirmation | `npx crewup clarify <run-id> --interactive` |
| Subagent has no result | Resume that agent for a result-only closeout |
| Result file exists but was not captured | Run `native-state reconcile-results`, then check `next-agent` |
| `next-agent` shows `action=wait` | Wait for the active agent result; this is not a user decision point |
| `next-agent` shows `action=repair` | Run `repair-plan` and route fixes to owner agents |
| `next-agent` shows `action=done` or `closed` | The run is closed; do not start more agents |
| tester/reviewer wrote invalid `status=fix-required` | Use `status=completed` plus `fixRequired=true`, then refresh repair-plan |
| Owner artifact is invalid | Resume the owner agent; do not let the main agent rewrite it |
| Repair rounds exceed budget | Keep the run open blocked/partial and ask the user whether to continue, narrow scope, or explicitly close |
| Preview URL or smoke check fails | Route repair to the owner agent in the current run |
| Local dependency/environment unavailable | Record the blocker and keep the run open by default |
| Sealed core drift | Restore with `npx crewup install --force`, or fix CrewUp in the source repository |

## blocked, partial, canceled

Blocked does not mean archived. If implementation, verification, review, preview, or release hits a problem, CrewUp should keep the current run open by default and route the next step back to the owning agent.

Only close a non-success run when the user explicitly asks to abandon, close, accept partial completion, or preserve a failed state:

```bash
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable" --close
npx crewup archive <run-id> --outcome=partial --reason="frontend done, backend blocked" --close
npx crewup archive <run-id> --outcome=failed --reason="tests cannot run in this environment" --close
npx crewup cancel <run-id> --reason="scope changed"
```

Without `--close`, `archive --outcome=blocked|partial|failed` only updates state and reports; it does not archive-close the run.

Closing creates:

- `RUN_SUMMARY.md`
- `logs/archive/archive-summary.md`
- `.harness/reports/<run-id>.md`

## Continue Current Run Or Create A Continuation

If a run is still open blocked/open partial, continue inside the current run first:

```bash
npx crewup explain <run-id>
npx crewup next-agent <run-id>
```

If an older version or manual action archive-closed a blocked run that should still be repaired, explicitly reopen it:

```bash
npx crewup native-state <run-id> reconcile-results
npx crewup repair-state <run-id> --reopen-blocked --apply
npx crewup report <run-id>
npx crewup next-agent <run-id>
```

If a run has already been archive-closed and later shows a UI, preview, deployment, login, or functional issue, create a continuation run:

```bash
npx crewup continue <source-run-id> "Fix the issue found after archive"
```

The new run reuses the source run's status card, summary, requirements, architecture, and implementation plan. The old run is not overwritten.

## Main Agent Reporting Standard

Main-agent status updates should stay short:

```text
Run: <run-id>
Status: active / requirements_plan
Verdict: IN_PROGRESS
Owner: requirements-plan
Next: npx crewup next-agent <run-id>
Why: <one-line explanation from crewup explain>
Status card: .harness/runs/<run-id>/RUN_STATUS.md
Details: .harness/runs/<run-id>/logs/run-report.md
```

Do not paste full subagent output, full logs, full context packs, or multiple possible next steps. Link to paths instead.
