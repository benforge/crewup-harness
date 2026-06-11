# Local Testing CrewUp

[中文](./local-testing.md) | English

Use this guide to test CrewUp before publishing. The recommended path is to create a local tarball with `npm pack`, then install it into a temporary project. This is closer to a real user install than running only inside the source repository.

## What To Test

Local testing should cover:

- install / init / check
- `install --force` safe upgrade and runtime-state preservation
- `install --reset` clean reinstall
- sealed core / `.harness/core-lock.json`
- run creation and semantic runId generation
- native plan and `next-agent` ordering constraints
- implementation agents waiting for architecture assignment
- audit / gate-check overreach detection
- archive / cancel / continue lifecycle

## Fast Commands

Inside the source repository:

```bash
npm run harness:check
npm test
npm run test:install-flow
npm run harness:test-flow
npm run release:preflight
```

## Install Flow Test

To test only install, upgrade, `--force`, `--reset`, and sealed core:

```bash
npm run test:install-flow
```

This creates a temporary project, installs the local tarball, and validates:

- `crewup install` writes `.harness/core-lock.json`
- `crewup install --force` updates core while preserving runs, knowledge, project, reports, and dashboard
- `crewup install --reset` deletes old `.harness/` before reinstall
- editing installed `.harness/scripts/check.mjs` makes `crewup check` detect sealed core drift
- `doctor` and `check` work in a target project

## Strict Workflow Test

```bash
npm run harness:test-flow
```

This creates a temporary project, installs the local package, and validates:

- run creation
- explicit `lite` opt-in run creation
- `lite` lightweight evidence files and pending-finish protection
- plan-only routing
- strict workflow routing
- `requirements-plan -> requirements -> architect` ordering
- `next-agent` runnable / blocked output
- architecture-owned implementation dispatch
- native-state premature-start blocking
- repair-artifacts owner guard
- tool-fallback logging
- status/runs status cards
- cancel/archive/continue lifecycle closeout
- audit overreach blocking
- gate-check owner artifact blocking

## Manual Tarball Test

PowerShell example:

```powershell
npm pack
mkdir C:\tmp\crewup-app
cd C:\tmp\crewup-app
npm init -y
npm install -D "C:\path\to\crewup-harness-0.3.9.tgz"
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

## Minimal Run Case

```bash
npx crewup run --mode=strict "Use CrewUp to build a tiny counter web app and run the full workflow. Acceptance criteria: page shows counter, initial value is 0, +1/-1/reset work, value persists after refresh, build/test pass. Scope: tiny frontend only."
```

Then inspect:

```bash
npx crewup status <run-id>
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

## API Key Check

If you want to test real AI subagents:

```bash
npx crewup doctor
```

SDK/API mode or `inspect --ai` requires:

```powershell
$env:OPENAI_API_KEY="sk-..."
```

Codex Desktop native subagents depend on Codex Desktop login state and tool capability. CrewUp only generates spawn prompts, native-state records, and gates. It does not log into model services for the user.

## Common Failures

### `next-agent` Does Not Return The Next Agent

The upstream result is probably not registered, or native-state is incomplete:

```bash
npx crewup native-state <run-id> diagnose
```

### `gate-check` Reports Owner Artifact Provenance

The artifact may have been written by the main agent, or the subagent did not declare `artifactUpdates` in result JSON. Resume the owner agent; do not let the main agent copy content into the artifact.

### `repair-artifacts` Refuses To Modify An Artifact

This is expected protection. In an active native run, owner artifacts should be repaired by the owner agent first. Use this only for explicit maintenance or legacy normalization:

```bash
npx crewup repair-artifacts <run-id> --allow-owner-artifacts
```

### Sealed Core Drift

User projects should not patch `.harness` core scripts. Restore installed core:

```bash
npx crewup install --force
```

If it is a CrewUp product bug, add a regression test, fix it, and publish from the CrewUp source repository.
