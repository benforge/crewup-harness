# Harness Workflow

English | [harness-workflow.md](./harness-workflow.md)

CrewUp is explicit opt-in. Without a clear CrewUp/harness/run signal, the chat stays outside the harness. Once CrewUp is active, the strict loop applies and the main agent only orchestrates, delegates, checks gates, and summarizes.

There are two valid entries:

- CLI entry: the user runs `npx crewup run "..."`.
- Chat entry: the user explicitly asks to use CrewUp. In this case, the main agent runs `npx crewup run` itself, extracts the runId, then continues with `next-agent`.

The chat entry should not require the user to manually create a runId first.

Prefer `npx crewup ...` in target projects because freshly installed projects may not have `npm run harness:*` scripts in `package.json`.

## Execution Prerequisites

CrewUp can create runs, tasks, context packs, audits, and gates without an API key. Real AI subagent execution requires the selected agent environment to be configured:

- `codex` native mode requires a Codex environment that can launch subagents. Codex Desktop / CLI may use its own login state; SDK/API paths and `inspect --ai` require `OPENAI_API_KEY`.
- `claude`, `cursor`, and `trae` currently use bridge mode. Those tools use their own authentication and must write CrewUp-compatible result JSON files back into the run.
- `manual` mode needs no AI key; a human or external tool executes the handoff and writes result JSON.

If native tools or model access are unavailable, record fallback and stop formal delegated work. Fallback does not authorize the main agent to write owner artifacts or business code.

## Language And Contracts

- Human-facing coordination is Chinese by default: status updates, blockers, handoffs, subagent summaries, and final user-facing explanations.
- Harness-owned contracts stay English: artifact headings, JSON fields, file paths, commands, status values, and schema-owned labels.
- This split keeps the user experience Chinese while avoiding encoding drift and false gate failures in machine-checked artifacts.

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

Negation-aware routing only removes false-positive scope. If the user says `no backend/database/auth/routing` or `不需要 backend、database、auth、routing`, CrewUp should not spawn backend/database owner agents just to confirm they are irrelevant. This does not weaken the strict workflow for the remaining real scope.

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
npx crewup context-pack <run-id> --agents=<agents>
npx crewup native-plan <run-id> --agents=<agents>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> status
```

The main agent should use `next-agent` before spawning. It returns only agents whose prerequisites are complete and lists blocked agents with missing upstream results. The main agent then uses `spawn_agent`, `wait_agent`, and `close_agent` where available.

Native-state mutations must be serial. Do not run `mark-spawned`, `mark-result`, or close-state commands in parallel for the same run.

`native-state mark-spawned` enforces upstream prerequisites. For example, `architect` cannot be marked spawned until `requirements-plan` and `requirements` have completed and their results have been captured. This is the required harness ordering:

```text
requirements-plan -> requirements -> architect -> implementation agents -> tester -> reviewer -> release
```

The main agent may prepare tasks and native plans ahead of time, but it must not start downstream agents before their prerequisite results are captured.

`gate-check` also audits owner artifacts. If `artifacts/requirement-plan.md`, `artifacts/requirement.md`, `artifacts/architecture.md`, or other owner artifacts appear before the owner agent has completed and reported them through `artifactUpdates`, the gate fails. This keeps the main agent in an orchestration role instead of letting it fill formal artifacts directly.

## Orchestration Audit

Use `audit` when you want a direct stability check for the workflow itself:

```bash
npx crewup audit <run-id>
```

`audit` checks dispatch order, premature downstream starts, implementation agents that were not assigned by `implementation-plan.md`, owner artifacts without owner provenance, tester/reviewer feedback that still needs delegated repair, retained subagent pressure, and large context/token budgets.

`gate-check` answers "can this run pass the quality gate?". `audit` answers "is the orchestration staying clean, calm, and delegated?". A clean audit writes `logs/orchestration-audit.md` and `logs/orchestration-audit.json`.

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
