# Changelog

## Unreleased

## 0.3.7

- Added `crewup audit <run-id>` / `npm run harness:audit` for orchestration stability checks across dispatch order, owner artifact boundaries, implementation-plan assignments, repair loops, retained subagent pressure, and context/token budget warnings.
- Added `encoding-policy.yaml`, main-agent UTF-8 guidance, and `doctor` terminal code-page detection so Windows users can distinguish terminal mojibake from real document corruption.
- Added detailed Getting Started and Local Testing docs in Chinese and English, including API key requirements, Codex native prerequisites, bridge/manual mode behavior, local `npm pack` testing, and first-run troubleshooting.
- Added copy-ready example cases under `examples/crewup-cases/` for counter MVP full workflow, fullstack blog plan-only workflow, and docs-only update workflow.
- Clarified that CrewUp is a workflow harness, not a model provider: Codex native execution depends on Codex login/native tools or API-backed automation; SDK/API paths and `inspect --ai` require `OPENAI_API_KEY`; Claude/Cursor/Trae use their own credentials through the bridge.
- Added hard native-state spawn prerequisite enforcement: downstream agents such as `architect` cannot be marked spawned until required upstream agents such as `requirements-plan` and `requirements` have completed and their results are captured.
- Added `crewup next-agent <run-id>` / `npm run harness:next-agent` to show only currently runnable native subagents and blocked prerequisite reasons.
- Strengthened `gate-check` owner artifact auditing so formal owner artifacts fail gates when they appear before the owner agent completed and reported them through `artifactUpdates`.
- Added optional integrations scaffolding with `integrations.yaml`, `crewup integrations status`, doctor visibility, and CodeGraph declared as a disabled optional code intelligence provider.
- Added negation-aware workload, scope, context, and naming logic so phrases such as "no backend/database/auth/routing" do not trigger high-risk classification, backend/database agents, full context, or auth run names.
- Switched generated agent responsibility text to clean English while requiring Chinese for human-facing summaries, blockers, handoffs, and coordination comments.
- Added artifact scaffolds to generated owner-agent tasks to reduce missing-heading repair loops.
- Added native-state handle validation to reject accidental `--handle=<id>` values.
- Clarified that target projects should prefer `npx crewup ...` entry commands because npm scripts may not be installed.
- Added pack-install regression coverage to prevent `requirements` and `architect` from being started in parallel in strict planning flows.
- Added architecture-owned implementation dispatch: implementation agents selected during run preparation are candidates only; `next-agent` and `native-state` now require `implementation-plan.md` to assign an implementation agent before it can start.
- Added a maintainer script map documenting core product commands, internal pipeline scripts, optional/advanced scripts, and consolidation candidates.
- Simplified CLI help into core workflow, subagent planning, runtime support, optional/advanced, and compatibility/maintenance groups.
- Centralized agent role sets and execution order in `agent-roles.mjs` so gate, transition, native-state, native-plan, and dispatch checks share the same role contract.
- Removed obsolete/duplicate scripts: `finalize.mjs`, `requirements-interview.mjs`, `requirements-plan.mjs`, `desktop-plan.mjs`, `desktop-light.mjs`, and `overlay-report.mjs`.

## 0.3.6

- Kept explicit strict/full-loop requests on the full workflow while tightening task contracts to reduce repeated artifact/test/review repair loops.
- Converted core agent role files, artifact schema, model policy, workload analysis, native task prompts, gate checks, and strict-flow tests to English/ASCII source text to avoid Chinese mojibake in scripts and Markdown agreements.
- Added stable fallback write scopes for implementation agents, especially frontend (`src/**`, `package.json`, `index.html`, `public/**`, `vite.config.*`), so changed-files ownership does not require manual run-task repair.
- Added explicit tester baseline checks for frontend/local MVP runs: non-blank page, add, refresh persistence, complete-state persistence, delete-after-refresh, empty input rejection, desktop/mobile viewport, build, and service shutdown.
- Standardized reviewer pass format around `## Conclusion` with `- [x] pass|conditional pass|fail` and `## Blocking Issues` with `- none` to avoid release gate false positives.
- Strengthened native result contracts to require `artifactUpdates` / `artifactsUpdated` and reject `artifacts` as a substitute.
- Added `native-state diagnose` to report missing handles, uncaptured result files, invalid result JSON, and recommended recovery actions.
- Added `repair-plan` to turn tester/reviewer `requiredFixes` into grouped repair tasks under `tasks/repairs/`.
- Added `gate-check --entry` / `--completion` so stage entry checks can be distinguished from stage completion checks.
- Added native-state locking and serial mutation guidance to reduce `mark-spawned` / `mark-result` race conditions.

## 0.3.5

- Fixed a `gate-check` syntax failure caused by a duplicate `hasTemplatePlaceholder` declaration.
- Stopped `harness:next` from suggesting `plan -> implement` for `plan_only` / `discovery` runs; planning-only runs now explicitly tell the user to create a separate implementation run for code changes.
- Added flow coverage for `gate-check` syntax safety and plan-only `next` guidance.

## 0.3.4

- Added native result files to each subagent's allowed write scope so subagents can write their own `<agent>.result.md` and `<agent>.result.json` outputs without the main agent creating them.
- Clarified native runner policy: the main agent may register existing subagent result files, but must not create, summarize, or copy result files on behalf of the subagent.
- Made `native-state mark-result` idempotent when the same agent/status/result paths are already captured, preventing duplicate result registrations.

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
