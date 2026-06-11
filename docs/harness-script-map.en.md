# CrewUp Script Map

[中文](./harness-script-map.md) | English

This document is for maintainers. It defines CrewUp's public product surface, core pipeline scripts, compatibility tools, and maintenance boundaries. Regular users do not need to memorize every `.harness/scripts` file; they mainly need the `install -> init/check -> run -> status/next-agent -> gate/report/archive/finish` path.

For the user-facing rules on which commands are daily-use, which commands can be ignored, and how complete/incomplete outcomes behave, start with [Command And Completion Governance](./command-governance.en.md). This page keeps the lower-level script boundary view.

## Command Governance Summary

| Tier | Audience | Commands |
| --- | --- | --- |
| Daily primary path | Regular users and the main agent | `doctor`, `init`, `check`, `run`, `status/runs`, `explain`, `finish`, `archive`, `cancel`, `continue` |
| strict operations | Main agent and maintainers | `next-agent`, `clarify`, `native-state`, `audit`, `gate-check`, `report`, `preview-smoke`, `dev-service` |
| Internal pipeline | Called by `run`, `finish`, or orchestration | `prepare-run`, `spec-freeze`, `context-pack`, `native-plan/agent-plan`, `transition`, `changed-files`, `archive-commit`, `token-ledger`, `knowledge-select` |
| Optional advanced | Only when the capability is needed | `tool-fallback`, `knowledge`, `dashboard`, `product-sync`, `learn`, `learn-promote` |
| Compatibility and maintenance | Recovery or old-run compatibility | `repair-plan`, `repair-state` |

Governance rules:

- Keep the public command surface small; removed legacy commands should have a clear replacement path.
- Daily users only need the primary path; the main agent runs strict operator commands.
- Internal, optional, advanced, and maintenance commands are not user starting points.
- Non-success stays open by default; only explicit `--close` closes partial/blocked outcomes.

## Public Product Entry Points

These commands should stay stable and documented:

| Command | Script | Role |
| --- | --- | --- |
| `crewup install` | `bin/crewup.mjs` | Install or upgrade `.harness/`; `--force` preserves runtime state, `--reset` reinstalls the core |
| `crewup doctor` | `doctor.mjs` | Check Node, git, template state, sealed core, and optional capabilities |
| `crewup inspect --no-ai` | `inspect.mjs` | Optional scan for existing or complex repositories |
| `crewup init` | `init.mjs` | Generate `.harness/project/` adaptation and agent environment config |
| `crewup check` | `check.mjs` | Validate core files, config, templates, encoding, and workflow constraints |
| `crewup run` | `run.mjs` | Create a formal run; formal work starts with a run |
| `crewup status` / `crewup runs` | `status.mjs` | Show one run status card or the run list |
| `crewup next-agent` | `next-agent.mjs` | Compute runnable subagents from the current stage, artifacts, and implementation plan |
| `crewup native-state` | `native-state.mjs` | Register, reconcile, and diagnose native subagent handles, results, and fallbacks |
| `crewup audit` | `orchestration-audit.mjs` | Audit dispatch order, owner boundaries, repair loops, and context pressure |
| `crewup gate-check` | `gate-check.mjs` | Run quality gates, artifact ownership checks, and main-agent overreach checks |
| `crewup report` | `report.mjs` | Generate the run delivery report |
| `crewup preview-smoke` | `preview-smoke.mjs` | Check preview URLs and write user-verifiable preview evidence |
| `crewup archive` | `archive.mjs` | Mark any outcome; non-success stays open by default and closes only with explicit `--close` |
| `crewup cancel` | `cancel.mjs` | Cancel a run while preserving the reason and evidence |
| `crewup continue` | `continue-run.mjs` | Create a continuation run from a previous run |
| `crewup finish` | `finish.mjs` | Finish reporting, archive, and commit according to policy |

## Core Run Pipeline

These scripts are called by public entry points or the main agent and form the strict workflow implementation:

| Script | Responsibility |
| --- | --- |
| `prepare-run.mjs` | Create run scaffolding, candidate agents, task lists, and context |
| `spec-freeze.mjs` | Snapshot the current request summary; it does not bypass requirements agents |
| `clarify.mjs` | Render the `requirements-plan` clarification card for user confirmation |
| `context-pack.mjs` | Generate compact context packs for subagents |
| `native-plan.mjs` | Generate Codex-native or bridge handoff plans |
| `transition.mjs` | Apply stage transitions and stage entry gates |
| `changed-files.mjs` | Record and validate changed-file ownership for the run |
| `archive-commit.mjs` | Create a commit when finish/archive policy allows it |

## Subagent And Repair Support

These scripts support subagent result collection, repair routing, or manual recovery:

| Script | Responsibility |
| --- | --- |
| `repair-plan.mjs` | Group tester/reviewer required fixes by owner |
| `repair-state.mjs` | Repair malformed run/native state after diagnostics |
| `dev-service.mjs` | Start, stop, or inspect run-scoped preview services |
| `preview-smoke.mjs` | Run HTTP smoke checks against preview URLs and write `artifacts/preview-smoke.md` plus `logs/preview-smoke.json` |
| `dashboard.mjs` | Generate `.harness/dashboard/index.html` |

## Optional And Advanced

These are not required for the smallest strict closed loop, but they are useful in complex projects or integrations:

| Script | Role |
| --- | --- |
| `tool-fallback.mjs` | Record fallback evidence when optional tools such as Context7, MCP servers, or plugins are unavailable |
| `knowledge.mjs` / `knowledge-select.mjs` | Refresh and select knowledge-layer context |
| `learn.mjs` / `learn-promote.mjs` | Generate candidate lessons and explicitly promote Memory Hints |
| `product-sync.mjs` | Sync long-lived product docs after release and user confirmation |
| `token-ledger.mjs` | Record token budget and usage |

## Role Source Of Truth

Agent role sets and execution order are centralized in `.harness/scripts/lib/agent-roles.mjs`. Dispatch, gates, native-state, native-plan, and transitions should not maintain separate role lists.

| Group | Agents |
| --- | --- |
| Planning | `requirements-plan`, `requirements`, `architect` |
| Optional coordination | `pm` |
| Implementation | `frontend`, `docs`, `backend`, `database`, `devops` |
| Code implementation | `frontend`, `backend`, `database`, `devops` |
| Write owner | `frontend`, `docs`, `backend`, `database`, `devops`, `tester` |
| Verification/release | `tester`, `reviewer`, `release` |

## Current Core Workflow Contract

1. `crewup run` creates a formal run and candidate agents; implementation agents remain candidates.
2. `requirements-plan -> requirements -> architect` must complete in order.
3. `requirements-plan` owns clarification cards, questions, boundaries, acceptance criteria, and non-goals; the main agent must not author `requirement-plan.md`.
4. `requirements` owns `requirement.md`; `architect` owns `architecture.md` and `implementation-plan.md`.
5. `implementation-plan.md` must assign implementation work with exact agent ids.
6. `next-agent` and `native-state` decide runnable subagents from stage, artifacts, provenance, and implementation assignments.
7. Implementation candidates not assigned by `implementation-plan.md` are skipped and do not block tester.
8. Tester/reviewer feedback must route back to owner implementation agents; the main agent must not directly fix business code.
9. Prefer `audit`, `gate-check`, and `report` before closing retained subagents.

## Removed Historical Paths

- `finalize.mjs` was removed; use `finish.mjs`.
- Old `requirements-interview.mjs` and script-level `requirements-plan.mjs` were removed; requirements artifacts must be written by the corresponding subagents.
- `desktop-plan.mjs` and `desktop-light.mjs` were removed; non-native environments use bridge handoff generated by `native-plan.mjs`.
- `next.mjs`, `verify.mjs`, `repair-artifacts.mjs`, `archive-status.mjs`, `integrations.mjs`, `cleanup.mjs`, `skills-*`, and `orchestrate.mjs` were removed; use `explain`/`drive`/`next-agent`, tester/gate/preview evidence, `archive-commit --dry-run`, `doctor`, owner repair, and native result capture instead.
