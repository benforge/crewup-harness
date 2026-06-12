# Changelog

## 0.4.4

- Hardened native result capture: `native-state mark-result` and `reconcile-results` now reject completed owner artifacts that are missing required schema headings, so malformed `requirement-plan.md`, `requirement.md`, `architecture.md`, or `implementation-plan.md` cannot be captured and discovered only at final gate time.
- Strengthened generated subagent task prompts with an explicit required artifact skeleton and exact heading instructions for owned artifacts.
- Added flow coverage proving malformed owner artifact headings are rejected before native result capture succeeds.

## 0.4.3

- Changed requirement and tester guidance so users no longer need to provide build/test/lint commands in requests; CrewUp agents discover validation from project evidence such as package manifests, README, CI config, framework config, and tests.
- Updated lite templates, validation templates, agent rules, README examples, getting-started docs, local-testing docs, and example prompts to describe desired outcomes first and validation discovery second.
- Strengthened tester reporting so `test-report.md` records both validation discovery evidence and executed commands/checks.

## 0.4.2

- Added the Memory Hints learning path: `crewup learn <run-id>` extracts candidate lessons, `crewup learn-promote <lesson-id>` explicitly promotes valuable lessons, and the knowledge layer selects compact hints instead of loading full run history.
- Wired archive/knowledge refresh so run closeout can produce candidate lessons while keeping promotion explicit and auditable.
- Slimmed the public command surface by removing low-value historical commands: `next`, `verify`, `repair-artifacts`, `archive-status`, `integrations`, `cleanup`, `skills-*`, and `orchestrate`.
- Updated CLI help, package scripts, checks, flow tests, script maps, command governance, local testing docs, workflow docs, and optional integration docs to point to the stable replacements.
- Refreshed the README product positioning and hero asset for the current architecture: explicit runs, delegated owners, gates, archive evidence, and low-token reusable memory.

## 0.4.1

- Rewrote the new Chinese mode, command-governance, and lite-v2 docs as clean UTF-8 so user-facing governance pages render correctly.
- Replaced non-ASCII chat examples inside `workflow-modes.mjs` with ASCII examples to avoid terminal encoding drift in CLI help.
- Hardened `crewup check` mojibake detection with additional common UTF-8/GBK corruption tokens while avoiding self-triggering on the checker source.

## 0.4.0

- Added explicit public run modes: `lite`, `strict`, `plan`, and `discovery`; real `crewup run` now requires an explicit mode while `--profile` remains a compatibility alias.
- Added `crewup drive <run-id>` as a deterministic orchestration helper for reconcile, stale/wait/repair/spawn decisions, and scriptable closeout.
- Hardened strict workflow dispatch: unassigned implementation candidates no longer block closeout, tester/reviewer wait for assigned implementation owners, and stale active agents use progress checkpoints before result-only closeout.
- Added fixed root artifacts and hard finish gates for `lite`, `plan`, and `discovery`, including no-code business-change guards for plan/discovery.
- Added `repair-state --prune-unassigned-implementation` for safe cleanup of legacy unassigned implementation candidates.
- Improved clarification UX with clear `ACTION REQUIRED` prompts, copyable answer formats, interactive guidance, and status/explain surfaces that show when user input is required.
- Refreshed command/mode governance docs and removed unused lightweight template files.

## 0.3.21

- Added `crewup explain <run-id>` / `crewup health <run-id>` as the single diagnostic entry point for confusing, stuck, open, or closed runs.
- Updated main-agent rules so status/completion/blocker answers should be based on `crewup explain` instead of chat memory.
- Hardened run-health wording for success, blocked, partial, failed, canceled, and closed states so archived runs do not appear runnable.
- Restored clean Chinese/English run status wording in `RUN_STATUS.md` generation and rewrote runbook/troubleshooting docs without mojibake.
- Added flow coverage for `crewup explain` on active and closed runs.

## 0.3.20

- Hardened `next-agent` closeout behavior: done, canceled, failed, or archived runs now return `action=done|closed`, `next=null`, and no runnable agents.
- Hardened native result recapture: `native-state mark-result` and `reconcile-results` now refresh `result_captured_at` when an existing result file path is rewritten, preventing stale repair-plan timeline loops.
- Improved `repair-plan` normalization for object-shaped `blockingIssues`, `owner`, and `agent` fields so repair tasks remain readable and do not render `[object Object]`.
- Added regression coverage for archived-run dispatch, same-path result recapture, and object-shaped repair feedback.
- Expanded troubleshooting/runbook docs for stale repair loops, invalid tester/reviewer statuses, and closed-run next-agent behavior.

## 0.3.19

- Fixed `next-agent` repair routing so an unresolved `logs/repair-plan.json` keeps reviewer/release blocked even if native-state result metadata was later cleared or reconciled.
- Added repair-plan timeline handling: owner agents must complete after the repair plan, then tester/reviewer results before the repair are treated as stale and verification is rerun instead of skipping ahead.
- Added regression coverage for the real-world case where tester requested frontend repair, repair-plan existed, and `next-agent` previously allowed reviewer too early.

## 0.3.18

- Fixed `native-state reconcile-results` so result JSON files with a matching `agent` field are validated against the current reconciled agent instead of the top-level CLI argument.

## 0.3.17

- Added explicit `next-agent` wait semantics for active subagents: when tester/reviewer/etc. is running, the CLI now returns `action: wait`, `waitFor`, and `userInputRequired: false` instead of leaving the main agent to infer downstream choices.
- Updated native-state lifecycle sync so `mark-spawned` records a wait next action in `RUN_STATUS.md`, preventing the main agent from asking users to choose reviewer vs owner repair while tester is still running.
- Treat tester/reviewer `fixRequired`, `requiredFixes`, or `blockingIssues` as a formal repair state even when the result status is `completed`; `next-agent` now returns `action: repair` and blocks reviewer/release until owner repair and re-verification happen.
- Improved `repair-plan` generation for tester/reviewer fixes that use `description`, `scope`, or `relatedAcceptanceCriteria`, and added `repair-plan --refresh` to regenerate the current repair task without consuming another repair round.
- `native-state reconcile-results` now refreshes already-captured result metadata so older runs can recover from tester/reviewer repair feedback after upgrading.
- `native-state mark-resumed` now clears stale result metadata before an owner/tester/reviewer rerun, preventing old failed feedback from leaking into the next repair cycle.

## 0.3.16

- Changed non-success archive behavior: `archive --outcome=blocked|partial|failed` now keeps the current run open by default, and only archive-closes when `--close` / `--confirm-close` is explicit.
- Added native result reconciliation through `native-state reconcile-results` and report-time auto-reconciliation so existing subagent result files are not shown as `not captured`.
- Added `repair-state --reopen-blocked --apply` for recovering older runs that were archive-closed while still needing owner-agent repair.
- Updated main-agent and user docs to clarify that implementation/test/review blockers should be repaired inside the current open run, while continuation runs are for already archived runs.

## 0.3.15

- Refined default external skill candidates to a smaller, complementary set of eight skills across frontend design, Tailwind consistency, web app testing, accessibility, performance, architecture, code review, and documentation/ADRs.
- Removed the overlapping `web-design-guidelines` default candidate to reduce duplicated UI guidance, token pressure, and role confusion.

## 0.3.14

- Added run-level completion contracts: every prepared run now gets `GOAL.md` and `completion-contract.json` with success criteria, non-goals, constraints, required evidence, and repair budget.
- Updated `RUN_STATUS.md` and `RUN_SUMMARY.md` to show an explicit iteration verdict and completion-contract evidence, so users can distinguish `SUCCESS`, `PARTIAL`, `BLOCKED`, `FAILED`, `CANCELED`, and in-progress states at a glance.
- Added gate checks for missing or malformed completion contracts before release/done closeout.
- Added bounded repair-loop tracking through `logs/repair-loop.json`; `repair-plan` now records repair rounds and stops when `maxRepairRounds` is exceeded.
- Strengthened main-agent closeout rules so completion answers must be based on `GOAL.md`, `completion-contract.json`, `RUN_STATUS.md`, gates, and reports instead of chat memory.
- Expanded bilingual runbook guidance for completion verdicts, completion contracts, and repair-loop overflow handling.

## 0.3.13

- Added `crewup preview-smoke <run-id> --url=<preview-url>` / `npm run harness:preview-smoke` to turn preview URL checks into run evidence through `artifacts/preview-smoke.md` and `logs/preview-smoke.json`.
- Fixed delivery report closeout semantics: `deliveryStatus=closed` now follows `state.archived=true`, while archive commit status is reported as separate Git audit evidence.
- Tightened `transition --force`: force transitions now require `--force-reason` and write an audited `logs/state-repair.md` entry. `repair-state --closeout-only --apply` is documented as the preferred metadata repair path.
- Strengthened main-agent rules for archived runs: post-archive preview, deployment, or functional issues must create a continuation run unless the action is a no-file-edit runtime service operation.
- Added initial-commit baseline metadata and recommendations when creating runs in brand-new Git repositories.
- Updated README, runbooks, script maps, and service policy docs to explain preview smoke, closed-vs-commit audit semantics, continuation-after-archive behavior, and force-transition boundaries.
- Expanded pack-install flow coverage for preview smoke evidence, archived report status, and force-transition guards.

## 0.3.12

- Rewrote the Chinese README and primary Chinese docs as clean UTF-8, with a more professional open-source project structure, clearer product positioning, command tables, API key guidance, workflow boundaries, and stability guarantees.
- Added stable closeout behavior for new Git repositories: archive commit now records a skipped audit when there is no initial commit instead of blocking an otherwise successful run.
- Restored localized `RUN_STATUS.md` rendering and clarified the done-but-not-archived next action.
- Strengthened native-state diagnostics for slow result capture and result files that exist but have not been registered.
- Tightened frontend and reviewer agent rules to reduce avoidable build-script repair loops and non-blocking reviewer-driven rework.
- Expanded local testing and test matrix docs around pack-install testing, quoted tarball paths, no-initial-commit archive behavior, and release preflight expectations.

## 0.3.11

- Re-audited the CLI/package/check entry surface and kept public scripts stable instead of deleting exposed commands.
- Rewrote the script boundary docs as current maintainer guidance and added a canonical English `harness-script-map.en.md` while keeping the old English path as a compatibility note.
- Removed stale historical workflow iteration and hardening roadmap docs from the published documentation set.
- Restored `.harness/config/workflow.yaml` display text to clean UTF-8-safe English while preserving the strict stage/order/gate contract.
- Extended `harness:check` so the template package scans public README/docs for suspicious mojibake, while installed user projects only scan harness-owned files and local AI rule files.
- Updated the test matrix docs to reflect install-flow, full-flow, sealed core, and documentation encoding checks.

## 0.3.10

- Added sealed CrewUp core verification: `crewup install` now writes `.harness/core-lock.json`, and `check`, `doctor`, and `gate-check` detect local `.harness` core drift inside user projects.
- Blocked project feature runs from treating `.harness/scripts`, `.harness/config`, `.harness/orchestrator`, agents, templates, contracts, or rules as normal project-run changed files.
- Clarified in the runbook and core-boundary docs that harness product bugs should be fixed in the CrewUp source repository, not patched during a user project's business run.
- Added a dedicated install/upgrade/reset test matrix through `npm run test:install-flow` / `npm run test:local-install`, and documented when to run each verification path.
- Rewrote the Chinese README as clean UTF-8 with a more polished open-source project structure, quickstart, workflow explanation, commands, validation, and docs navigation.

## 0.3.9

- Replaced the default backlog-first intake flow with a Run-only lifecycle: `crewup run` now directly creates a formal run as the core work unit.
- Added run lifecycle status files and commands: `RUN_STATUS.md`, `RUN_SUMMARY.md`, `crewup status`, `crewup runs`, `crewup archive`, `crewup cancel`, and `crewup continue`.
- Clarified that archive is evidence organization, not success; runs can archive `success`, `partial`, `blocked`, `canceled`, or `failed` outcomes.
- Added run branch metadata and best-effort run branch creation; dirty worktrees now create the run branch when Git permits it and record pre-existing changes in `git.dirtyAtStart`.
- Removed default backlog scripts and intake policy from the core workflow.
- Changed formal CrewUp runs to always start from requirements planning: `lite` now means shorter artifacts/context, not skipping `requirements-plan`, `requirements`, or `architect`.
- Blocked implementation agents when `artifacts/implementation-plan.md` is missing; development agents now require an architect-owned implementation plan that assigns exact agent ids.
- Removed `pm` from the default requirements chain so `requirements-plan -> requirements -> architect` stays sequential; `pm` is optional coordination only and cannot own `requirement.md`.
- Added a dedicated `requirements-plan` agent contract for interactive clarification, structured `clarificationQuestions`, and `needs_input` handoff before final requirements.
- Tightened clarification UX: requirements planning now asks at most 3 concise questions per round, Codex should prefer native Plan-mode choice UI when available, and non-Codex hosts use `crewup clarify --interactive` instead of long chat questionnaires.
- Added a Markdown `Clarification Card` section to `requirement-plan.md` so users can review confirmed facts, decisions, non-goals, and acceptance previews in a more scannable way before answering.
- Updated requirements clarification language rules so user-facing card content, questions, option labels, summaries, blockers, tests, and handoff notes follow the user's primary language while machine-checked headings and JSON fields stay English.
- Localized `RUN_STATUS.md` for Chinese user requests while keeping machine status values, artifact headings, paths, and JSON contracts in English.
- Added bilingual runbooks explaining healthy runs, completion criteria, blocked/partial/canceled closeout, and continuation runs.
- Updated workflow docs and pack-install tests so small formal runs still begin with `requirements-plan` and implementation waits for architecture assignment.

## 0.3.8

- Added `crewup tool-fallback <run-id>` / `npm run harness:tool-fallback` to record optional tool, MCP, plugin, and Context7 fallback evidence in run logs instead of leaving it only in chat.
- Strengthened main-agent orchestration rules: technical synthesis stays with `architect`, owner artifact repair returns to the owner agent first, and retained subagents should be closed after `audit`, `gate-check`, and `report` unless capacity forces earlier closure.
- Added repair lineage fields (`repairOf`, `repairReason`, `previousResultPath`) to native and bridge result contracts and surfaced repair context in run reports.
- Guarded `repair-artifacts` so it refuses to modify active owner-agent artifacts by default; explicit maintenance use now requires `--allow-owner-artifacts`.
- Rewrote mojibake-affected Chinese README and docs pages as clean UTF-8 and updated bilingual usage/testing docs for the current architecture.
- Expanded pack-install flow tests to cover tool fallback logging, repair-artifacts owner guard, repair lineage prompt fields, and the closeout ordering guidance.

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
