# Changelog

## Unreleased

## 0.3.3

- Narrowed placeholder detection in `next`, `gate-check`, and `transition` so normal planning terms such as `待确认问题`, `占位首页`, and `环境变量模板` no longer trigger unnecessary owner-agent repair loops.
- Added regression coverage for placeholder detection to prevent repeated subagent rework caused by gate false positives.

## 0.3.2

- Tightened planning-run orchestration so `requirements-plan`, `requirements`, and `architect` run sequentially with explicit prerequisites instead of being spawned together.
- Stopped `crewup run` from writing `requirement-plan.md` by default; formal planning artifacts are now delegated to their owner subagents unless `--seed-requirements-plan` / `--seed-artifact` is explicitly used.
- Added semantic run/backlog naming such as `plan-fullstack-blog-system`.
- Added artifact schema sections to generated subagent tasks so required headings are visible before gate checks.
- Raised `requirements` and `architect` to `gpt-5.5` / medium reasoning for formal planning artifacts.
- Improved `crewup init` onboarding with optional inspect, five clear agent choices, radio-style selection, and color-aware terminal output.
- Fixed run reports so reviewer-specific JSON fields are summarized correctly and zero-token context budgets are not shown as missing.
- Added bilingual documentation for planning-run order, artifact ownership, semantic naming, model tiers, and schema-first task generation.

## 0.3.1

- Changed `crewup install --force` into a safe upgrade path that preserves existing `.harness` runtime state, knowledge, backlog items, reports, dashboard output, and project adaptation.
- Added `crewup install --reset` for explicit destructive reinstall.

## 0.3.0

- Added feedback routing policy so tester/reviewer findings must be delegated back to implementation/docs agents instead of being fixed by the main agent.
- Added run-scoped dev service lifecycle commands and done/archive gates for leftover preview services.
- Clarified docs agent activation timing and main-window context budget rules.
- Updated the README hero artwork with a minimal white and blue product illustration.
- Expanded bilingual README and workflow docs around the CrewUp product model, role boundaries, feedback repair, preview services, and dashboard/docs timing.

## 0.3.0-beta.2

- Updated the README hero artwork with a more minimal blue, white, and black developer-tool style.

## 0.3.0-beta.1

- Added explicit CrewUp activation policy so normal chat does not automatically enter the harness.
- Added discovery and plan-only workflow routing, plus stricter lite profile semantics for formal narrow tasks.
- Added artifact owner/provenance checks and no-code gates to keep the main agent in an orchestration role.
- Expanded bridge result JSON examples with `artifactUpdates` and `artifactsUpdated`.
- Added pack-install release validation through `npm run test:pack-install` and `npm run release:preflight`.
- Reworked README and workflow docs around the large-project, strict-harness positioning.
- Replaced the README hero with a lighter minimal SVG.

## 0.2.0

- Rewrote the README into a more standard open-source project landing page
- Clarified that CrewUp adapts to the real repository shape instead of assuming a fixed layout
- Added clearer workflow, command, mode, docs, and boundary sections in both Chinese and English
- Verified the workflow with `npm test` and `npm run test:flow`

## 0.1.0

- Renamed the package and CLI to `crewup`
- Added brand assets and bilingual README structure
- Kept `.harness/` as the reusable workflow core
- Added workflow checks for packaging and template boundaries
