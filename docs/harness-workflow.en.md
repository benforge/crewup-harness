# Harness Workflow

English | [harness-workflow.md](./harness-workflow.md)

CrewUp is explicit opt-in. Without a clear CrewUp/harness/run signal, the chat stays outside the harness. Once CrewUp is active, the strict loop applies and the main agent only orchestrates, delegates, checks gates, and summarizes.

## Operating Model

CrewUp splits AI engineering work into three layers:

- Run state: `.harness/runs/<run-id>/` stores input, state, tasks, context packs, subagent results, services, reports, and archive logs.
- Role-owned artifacts: each formal artifact has an owner agent.
- Gates: transitions check artifact schema, provenance, native results, changed files, feedback loops, service shutdown, and archive readiness.

## Strict Flow

```text
intake -> requirements_plan -> requirements_confirm -> plan
  -> implement -> verify -> review -> release -> done
```

Explicit strict/full-loop requests stay on the full workflow. The harness does not reduce cost by skipping roles; it reduces repeated work through clearer task contracts, narrower generated prompts, and stricter result schemas.

## Owner Artifacts

| Artifact | Owner |
| --- | --- |
| `artifacts/requirement-plan.md` | requirements-plan |
| `artifacts/requirement.md` | requirements |
| `artifacts/architecture.md` | architect |
| `artifacts/implementation-plan.md` | architect |
| implementation files | frontend/backend/database/devops/docs owner agents |
| `artifacts/test-report.md` | tester |
| `artifacts/review-report.md` | reviewer |
| `artifacts/release-summary.md` | release |

The main agent must not copy subagent text into owner artifacts. If an owner agent fails to write the artifact, the run should be repaired, blocked, or resumed with that owner agent.

## Native Subagent Path

```bash
npm run harness:context-pack -- <run-id> --agents=<agents>
npm run harness:native-plan -- <run-id> --agents=<agents>
npm run harness:native-state -- <run-id> status
```

The main agent then uses `spawn_agent`, `wait_agent`, and `close_agent` where available.

Native-state mutations must be serial. Do not run `mark-spawned`, `mark-result`, or close-state commands in parallel for the same run.

## Artifact Contract

Core artifacts use English headings to avoid encoding drift. For example, `requirement.md` must include:

- `## Background`
- `## Goals`
- `## Non-Goals`
- `## Acceptance Criteria`
- `## Impact Scope`
- `## Test Requirements`
- `## Rollback Strategy`

Acceptance criteria should use `AC-01`, `AC-02`, and so on.

## Tester And Reviewer Contracts

Tester frontend/local MVP baseline:

- non-blank page
- add/create behavior
- persistence after refresh
- complete/toggle behavior
- completed state persistence after refresh
- delete behavior
- delete-after-refresh does not restore deleted data
- empty input rejection
- desktop viewport
- mobile viewport
- build command
- dev service shutdown

Reviewer pass format:

```markdown
## Conclusion

- [x] pass

## Blocking Issues

- none
```

This avoids false-positive release gates caused by ambiguous blocking wording.

## Repair Tools

```bash
npx crewup native-state <run-id> diagnose
npx crewup repair-plan <run-id>
```

- `native-state diagnose` reports missing handles, uncaptured result files, invalid JSON, and state/result mismatches.
- `repair-plan` reads tester/reviewer `requiredFixes` and creates owner repair tasks under `tasks/repairs/`.

## Release Validation

```bash
npm run release:preflight
```

This runs harness checks, example tests, temporary pack-install flow tests, and `npm pack --dry-run`.
