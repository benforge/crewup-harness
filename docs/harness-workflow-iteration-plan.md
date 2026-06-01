# Harness Workflow Iteration Plan

This document records workflow-level improvements for CrewUp. It is intentionally separate from product work: these changes improve how the harness coordinates agents, gates artifacts, and explains progress.

## Guiding Boundary

The main agent remains an orchestrator. It may choose workflow profiles, create runs, prepare context, spawn or route role agents, run gates, and summarize facts. It must not author the primary planning, implementation, verification, review, or release artifacts when the corresponding role agent exists.

Artifact ownership should stay explicit:

| Artifact | Owner |
| --- | --- |
| `requirement-plan.md` | `requirements-plan` |
| `requirement.md` | `requirements` |
| `architecture.md` | `architect` |
| `implementation-plan.md` | `architect` |
| `test-report.md` | `tester` |
| `review-report.md` | `reviewer` |
| `release-summary.md` | `release` |
| `main-agent-summary.md` | `main` |

## Iteration 1: Planning-Only Workflow Hardening

### Goals

- Add a first-class planning/discovery flow for new projects, directory planning, technology selection, module boundaries, and staged roadmaps.
- Prevent planning-only runs from drifting into business code changes.
- Make artifact ownership visible to tools and agents.
- Preserve the main-agent vision: the main agent routes and checks; role agents produce substantive artifacts.

### Changes

- Add `discovery` workflow profile for new-project planning and architecture discovery.
- Add `plan_only` workflow profile for explicit no-code planning requests.
- Add workload signals that detect requests such as "先规划", "目录结构", "技术选型", "不写代码", and "只做方案".
- Add `runType` to run state so gates can reason about intent instead of relying only on free text.
- Add `artifact_owners` to `artifact-schema.yaml`.
- Add gate-check logic that fails when no-code profiles have business code changes.

### Expected Agent Split

For `discovery` and `plan_only`:

| Agent | Responsibility |
| --- | --- |
| `requirements-plan` / `requirements` | Goals, non-goals, acceptance criteria, open questions |
| `architect` | Directory structure, module boundaries, technology route, phased plan |
| `reviewer` | Consistency check, missing risks, unclear boundaries |
| `main` | Run creation, context preparation, status transition, table summary, gate execution |

### Non-Goals

- Do not make the main agent write `requirement.md` or `architecture.md`.
- Do not bypass implementation approval for feature work.
- Do not auto-commit without archive policy and finish gates.
- Do not make planning-only runs create product source files.

## Backlog

- Add explicit activation policy so installing CrewUp does not make every AI chat enter harness mode.
- Add harness scope policy for large-project formal work only.
- Enforce artifact owner provenance from native-state or bridge results.
- Make run reports always include the agent result table.
- Productize `finish` output with `committed / skipped / blocked / disabled` archive status.
- Add a `crewup guide new-project --agent codex` command.
- Add a `bootstrap` command after the guide is stable.

## Iteration 2: Explicit Activation And Strict Scope

### Goals

- Keep CrewUp opt-in for open-source users.
- Prevent ordinary chat, simple Q&A, and tiny edits from entering the formal workflow by accident.
- Make `lite` a strict narrow formal run, not a quick mode.
- Preserve the main-agent boundary once a run exists.

### Rules

```text
No explicit CrewUp signal -> normal assistant
Explicit CrewUp signal -> strict harness
Inside a run -> no shortcuts
```

### Changes

- Add `.harness/config/harness-scope-policy.yaml`.
- Require `activation_policy.default: inactive_until_explicit`.
- Update root and harness AGENTS docs to say CrewUp only activates via `crewup run`, `harness:run`, explicit CrewUp/harness wording, or continuing an existing run.
- Update routing and main-agent docs so fallback never authorizes main-agent implementation.
- Redefine `lite` as a strict short path for narrow formal work.
- Add check coverage so the scope policy and lite semantics cannot silently drift.

## Iteration 3: Artifact Provenance And Stage Entry Gates

### Goals

- Make role artifact ownership enforceable, not just documented.
- Stop stage transitions before they enter a phase without required agent results and artifacts.
- Keep main-agent coordination separate from substantive artifact authorship.

### Changes

- Add `.harness/scripts/lib/artifact-provenance.mjs`.
- Collect artifact provenance from orchestrate artifact write logs, orchestrate results, native result JSON, and bridge result JSON.
- Gate required artifacts against `artifact-schema.yaml` owner declarations.
- Add transition-time owner provenance checks for requirement, architecture, implementation plan, test report, review report, and release summary.
- Add `workflow.stage_entry_gates` declarations and check coverage.
- Update native result JSON examples to include `artifactUpdates` and `artifactsUpdated`.

### Rule

```text
An artifact required for stage progression must come from its declared owner agent once the run has native, bridge, or orchestrate execution records.
```

## Verification Checklist

- `npm run harness:check`
- `npm test`
- `npm run harness:run -- --dry-run "<planning request>"`
- `npm run harness:inspect -- --no-ai --dry-run`
- `npm pack --dry-run`
