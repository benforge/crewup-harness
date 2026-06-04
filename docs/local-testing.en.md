# Local Testing Guide

[中文](./local-testing.md) | English

Use this guide to test the CrewUp package itself. The recommended path is to create a local tarball with `npm pack`, then install it into a temporary project. This is closer to a real user install than running only inside the source repository.

## What You Can Test

Without an API key, you can test:

- install / init / check
- run creation, naming, profile selection, and task generation
- native plan and next-agent ordering constraints
- architecture-owned implementation dispatch
- tool-fallback logging
- repair-artifacts owner guard
- audit / gate-check overreach detection
- pack-install flow

After Codex or API access is configured, you can also test:

- native subagents actually starting
- requirements-plan / requirements / architect owner artifacts being written by the owning subagents
- frontend/backend/database/devops/docs dispatch from `implementation-plan.md`
- tester/reviewer feedback delegation
- release / finish / archive closeout

## Pack From The Source Repository

```bash
cd "C:\Users\Administrator.SKY-20260324MFW\Documents\New project"
npm run release:preflight
npm pack
```

This creates something like:

```text
crewup-harness-0.3.8.tgz
```

## Create A Temporary Project

```bash
mkdir C:\Users\Administrator.SKY-20260324MFW\Documents\crewup-local-test
cd C:\Users\Administrator.SKY-20260324MFW\Documents\crewup-local-test
npm init -y
npm install -D "C:\Users\Administrator.SKY-20260324MFW\Documents\New project\crewup-harness-0.3.8.tgz"
```

## Initialize CrewUp

```bash
npx crewup install
npx crewup init --agent codex --yes
npx crewup doctor
npx crewup check
```

To test safe upgrade behavior:

```bash
npx crewup install --force
```

`--force` should preserve:

- `.harness/runs/`
- `.harness/knowledge/`
- `.harness/project/`
- `.harness/reports/`
- `.harness/dashboard/`

## Minimal Full Development Case

Paste this into the chat window:

```text
Use CrewUp to build a tiny counter web app and run the full workflow. Acceptance criteria: page shows counter, initial value is 0, +1/-1/reset work, value persists after refresh, build/test pass. Scope: tiny frontend only; no backend, database, auth, or routing.
```

This case is small but covers:

- requirements-plan
- requirements
- architect
- frontend
- tester
- reviewer
- release

## Key Check Commands

After you have a runId:

```bash
npx crewup next-agent <run-id>
npx crewup status <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

Check that:

- initial runnable agent is only `requirements-plan`
- `requirements` waits for `requirements-plan`
- `architect` waits for `requirements`
- implementation agents are decided by `implementation-plan.md`; missing plan means implementation agents cannot start
- `lite` cannot start implementation agents directly; it only shortens planning artifacts
- the main agent did not author owner artifacts
- tester/reviewer issues are delegated back to owner agents
- audit does not report `owner_artifact_before_owner_done`, `downstream_started_before_prerequisite`, or `unassigned_implementation_started`
- audit/gate/report run before retained subagents are closed unless capacity forces earlier closure

## Run Lifecycle Test

When testing blocked, partial, or canceled outcomes, make sure the run still closes cleanly:

```bash
npx crewup status
npx crewup status <run-id>
npx crewup archive <run-id> --outcome=blocked --reason="local dependency unavailable"
npx crewup cancel <run-id> --reason="test cancellation"
npx crewup continue <run-id> "Continue the previous unfinished counter MVP"
```

Check that:

- `.harness/runs/<run-id>/RUN_STATUS.md` always exists
- `.harness/runs/<run-id>/RUN_SUMMARY.md` exists after archive
- `.harness/runs/<run-id>/logs/archive/archive-summary.md` exists after archive
- `.harness/reports/<run-id>.md` exists after report or archive
- `continue` creates a new run whose `input.md` includes the source run status and summary

## Tool Fallback Test

```bash
npx crewup tool-fallback <run-id> --tool Context7 --reason "not available in local test" --fallback "use checked-in docs"
```

Check that these files were generated:

```text
.harness/runs/<run-id>/logs/tool-fallbacks.json
.harness/runs/<run-id>/logs/tool-fallbacks.md
```

## Script-Only Flow Test

In the CrewUp source repository:

```bash
npm run harness:test-flow
```

It creates a temporary project, installs the local package, and validates:

- run creation
- plan-only routing
- strict/full workflow routing
- next-agent ordering
- architecture-owned implementation dispatch
- native-state premature-start blocking
- repair-artifacts owner guard
- tool-fallback logging
- status/runs status cards
- cancel/archive/continue lifecycle closeout
- audit overreach blocking
- gate-check owner artifact blocking

## API Key Check

If you want to test real AI subagents:

```bash
npx crewup doctor
```

SDK/API mode or `inspect --ai` requires:

```powershell
$env:OPENAI_API_KEY="sk-..."
```

Codex Desktop native subagents depend on the Codex Desktop login state and available native tools. CrewUp generates spawn prompts, native-state, and gates; it does not log into model services for you.

## Common Failures

### `next-agent` does not return the next agent

The upstream result may not be captured, or native-state is incomplete:

```bash
npx crewup native-state <run-id> diagnose
```

### `gate-check` reports owner artifact provenance

The artifact may have been written by the main agent, or the subagent did not declare `artifactUpdates` in result JSON. Resume the owner agent instead of copying content in the main window.

### `repair-artifacts` refuses to modify an artifact

This is expected protection. In an active native run, owner artifacts should be repaired by the owner agent first. Use this only for explicit maintenance or legacy normalization:

```bash
npx crewup repair-artifacts <run-id> --allow-owner-artifacts
```

### `audit` reports too many retained agents

Run:

```bash
npx crewup native-state <run-id> recommend-close
```

Then release subagents that are no longer needed.
