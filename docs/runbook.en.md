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
| `GOAL.md` | Iteration goal, success criteria, non-goals, and repair budget |
| `completion-contract.json` | Machine-readable completion contract used by gates/status/report |
| `RUN_SUMMARY.md` | Archive summary reusable by later runs |
| `logs/run-report.md` | Delivery report for this run |
| `.harness/reports/<run-id>.md` | Global report copy |
| `artifacts/preview-smoke.md` | Preview URL verification evidence for web/full-stack runs |
| `logs/preview-smoke.json` | Machine-readable preview smoke result |
| `logs/archive/archive-summary.md` | Archive reason and outcome |

Useful commands:

```bash
npx crewup status
npx crewup status <run-id>
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup preview-smoke <run-id> --url=http://localhost:3000
npx crewup report <run-id>
```

## What Healthy Looks Like

A healthy run should satisfy:

- `RUN_STATUS.md` exists and shows status, stage, owner, and next command.
- `GOAL.md` and `completion-contract.json` exist; they define what `SUCCESS` means for this iteration.
- If the current directory is a Git repository, the run attempts to create a `crewup/<run-id>-<slug>` branch; pre-existing uncommitted files are recorded in `state.json` under `git.dirtyAtStart`.
- The initial `next-agent` result only allows `requirements-plan`.
- `.harness/core-lock.json` exists after install, and `npx crewup check` verifies that the sealed CrewUp core has not drifted.
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
- The project feature run modifies harness core files such as `.harness/scripts/**`, `.harness/config/**`, or `.harness/orchestrator/**`.
- `npx crewup check` reports `CrewUp sealed core files changed/added/removed`.

If a project run exposes a harness bug, mark the current run blocked/partial and open a separate harness-maintenance run for CrewUp itself. Do not patch `.harness` core scripts inside the same project feature run.

## Sealed Core Handling

CrewUp writes this file after install or upgrade:

```text
.harness/core-lock.json
```

It records fingerprints for reusable core files. Normal project runs must not modify:

```text
.harness/scripts/**
.harness/config/**
.harness/orchestrator/**
.harness/agents/**
.harness/templates/**
.harness/contracts/**
.harness/rules/**
```

If verification fails:

```bash
npx crewup check
npx crewup doctor
```

Handle it this way:

- Core drift inside a user project: run `npx crewup install --force` to restore the installed core. runs/knowledge/project/reports/dashboard are preserved.
- CrewUp product bug: fix it in the CrewUp source repository, test it, publish an upgrade, then let users upgrade.
- Current project run cannot continue: mark it open `blocked` or `partial` first. Archive-close it with `--close` only if the user explicitly abandons or closes that state, then use `crewup continue` later if needed.

When maintaining CrewUp itself, work in the CrewUp source repository, not inside a user project's business run. Add a regression test first, then fix the implementation, then run the test matrix.

## What Complete Means

First read `Iteration Verdict` at the top of `RUN_STATUS.md`:

| Verdict | Meaning | Successful completed iteration? |
| --- | --- | --- |
| `SUCCESS` | `status=done`, `outcome=success`, `archived=true`, with gate/report/archive evidence | Yes |
| `READY_TO_ARCHIVE` | done/success, but archive closeout is still pending | Not fully closed yet |
| `PARTIAL` | partially complete, or contains direct-chat work outside strict CrewUp owner-agent flow | No |
| `BLOCKED` | blocked by environment, dependency, tool, subagent, or workflow issue | No |
| `FAILED` | failed and should not be treated as delivery | No |
| `CANCELED` | intentionally stopped | No |
| `IN_PROGRESS` / `WAITING_USER` | still active or waiting for user input | No |

Successful completion requires all of these:

- The success criteria in `GOAL.md` / `completion-contract.json` are satisfied.
- `state.status` is `done`.
- `outcome` is `success`.
- Owner artifacts were produced by the owning agents.
- tester/reviewer issues were handled or explicitly closed.
- `audit` and `gate-check` pass.
- `report` was generated.
- Any dev service started by the run is stopped or has shutdown evidence.
- Web/full-stack runs report preview URLs; if a preview service was started, `preview-smoke` passed or a blocker explains why it could not pass.
- `RUN_STATUS.md` shows done and report/archive evidence exists.

Recommended commands:

```bash
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup preview-smoke <run-id> --url=<preview-url>
npx crewup report <run-id>
npx crewup finish <run-id>
```

`finish` is the success closeout path. Archive alone does not mean success unless `outcome=success`.

In `logs/run-report.md`, `deliveryStatus=closed` is based on `state.archived=true`. `logs/archive/git-commit.md` is only Git commit audit evidence: if the repository has no initial commit or commit creation is skipped by policy, the run can still be archived and closed.

### A Commonly Confusing Case

If you first see:

```text
Run A: done / success / archived
```

and then the user asks for startup scripts, login debugging, or service fixes that are done directly in chat without CrewUp owner agents, `native-state`, `gate-check`, and `finish`, interpret it this way:

- `Run A` is a successful CrewUp iteration.
- The later direct-chat edits are not part of `Run A`.
- If those later edits created `Run B` but did not follow the strict workflow, archive `Run B` as `partial` or `blocked`; do not describe it as a successful CrewUp iteration.
- To make the later edits a successful formal iteration, create a continuation run and route implementation, tests, review, release, and archive through the owning agents.

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
| Result file exists but was not captured | Run `npx crewup native-state <run-id> reconcile-results`, then `npx crewup report <run-id>` |
| `next-agent` shows `action: wait` | Wait for the active agent result; this is not a user decision point, so do not ask the user to choose reviewer or repair |
| `next-agent` shows `action: repair` | Run `repair-plan` first and route tester/reviewer required fixes to owners; do not start reviewer/release |
| Owner artifact is invalid | Resume the owner agent; do not let the main agent rewrite it |
| tester/reviewer requires fixes | Use `repair-plan` to assign owner implementation agents |
| Repair rounds exceed `maxRepairRounds` | Mark the current run open `blocked`/`partial`, then ask the user whether to continue, narrow scope, or explicitly close |
| Preview URL fails or smoke check fails | Do not let the main agent patch business code; route repair to the owner agent in the current run |
| Local dependency/environment unavailable | Record the blocker and keep the run open by default; close only if the user abandons it |
| Only part of the work is done | Keep the run open by default; close as `partial` only if the user accepts partial completion |
| Sealed core drift | Restore with `npx crewup install --force`, or fix CrewUp in the source repository |

## Cancel, Fail, Or Partial

Blocked does not mean archived. If implementation, verification, review, preview, or release hits a problem, CrewUp should keep the current run open and route the next step back to the owning agent:

```bash
npx crewup native-state <run-id> diagnose
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

Only close a non-success run when the user explicitly asks to abandon, close, accept partial completion, or preserve a failed state:

```bash
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable" --close
npx crewup archive <run-id> --outcome=partial --reason="frontend done, backend blocked" --close
npx crewup archive <run-id> --outcome=failed --reason="tests cannot run in this environment" --close
npx crewup cancel <run-id> --reason="scope changed"
```

Without `--close`, `archive --outcome=blocked|partial|failed` only updates state and reports; it does not archive-close the run. Closing creates:

- `RUN_SUMMARY.md`
- `logs/archive/archive-summary.md`
- `.harness/reports/<run-id>.md`

This makes the run reusable without relying on chat memory.

## Continue A Previous Run

If a run is still open blocked/open partial, continue inside the current run first:

```bash
npx crewup next-agent <run-id>
```

If an older version or a manual close archived a blocked run that should still be repaired, explicitly reopen it:

```bash
npx crewup native-state <run-id> reconcile-results
npx crewup repair-state <run-id> --reopen-blocked --apply
npx crewup report <run-id>
npx crewup next-agent <run-id>
```

If a run has already been archive-closed as blocked, partial, canceled, or failed and should continue:

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

If a successfully archived run later shows a preview, deployment, or functional issue, also create a continuation run. Do not keep editing files inside the archived run:

```bash
npx crewup continue <archived-run-id> "Fix the preview or functional issue found after archive"
```

The main agent may only perform runtime actions that do not edit files, such as stopping an old service, restarting a preview service, or rerunning `preview-smoke`. Any business code, config, dependency, or owner artifact change must enter a new run and be handled by the owning agent.

## Main Agent Reporting Standard

Main-agent status updates should stay short:

```text
Run: <run-id>
Status: active / requirements_plan
Verdict: IN_PROGRESS
Owner: requirements-plan
Next: npx crewup next-agent <run-id>
Status card: .harness/runs/<run-id>/RUN_STATUS.md
Details: .harness/runs/<run-id>/logs/run-report.md
```

Do not paste full subagent output, full logs, or full context packs. Link to paths instead.

Routine progress updates should stay within six lines. Do not include implementation reasoning, full artifact sections, native-state JSON, or several alternative next steps. If multiple actions look possible, run `next-agent` and report only the currently authorized next step.
