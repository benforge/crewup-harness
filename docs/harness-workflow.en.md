# Harness Workflow

[中文](./harness-workflow.md) | English

CrewUp is explicit opt-in by default. Without a clear CrewUp/harness/run signal, the chat remains normal assistant work. Once CrewUp is active, the strict loop applies and the main agent only orchestrates, delegates, checks gates, and summarizes.

## Product Model

CrewUp splits AI engineering work into run state, role-owned artifacts, and gates:

- Run state: every formal request gets a `.harness/runs/<run-id>/` workspace with input, state, tasks, context packs, subagent results, and reports.
- Role artifacts: requirements, architect, builder, tester, reviewer, docs, and release each own their delivery artifacts; the main agent routes and validates them.
- Gates: before moving forward, CrewUp checks stage gates, artifact provenance, repair feedback, no-code profiles, service shutdown, and archive readiness.

That makes CrewUp an AI delivery harness for large projects, not a shortcut command that silently writes code.

## Main Flow

```text
doctor -> install -> inspect -> init -> check -> run -> spec-freeze
  -> agent-plan -> orchestrate -> gate-check -> report -> finish
```

## Step Reference

| Step | Purpose | Main output |
| --- | --- | --- |
| `doctor` | Check runtime prerequisites | Environment and capability report |
| `install` | Copy the reusable core into a target repo | `.harness/`, `AGENTS.md`, runtime ignore |
| `inspect` | Discover the real project shape | `.harness/project/inspect.json`, adapter advice |
| `init` | Generate project adapter and execution config | `.harness/project/*` |
| `check` | Validate harness installation | Config, script, template, and boundary checks |
| `run` | Start a formal workflow or dry-run routing | Run state, tasks, context pack, token ledger |
| `spec-freeze` | Freeze a short requirement summary | `artifacts/spec-freeze.md`, `logs/spec-freeze.json` |
| `agent-plan` | Generate Codex native plan or bridge handoff | Native plan or `logs/agent-bridge/*` |
| `orchestrate` | Collect native/bridge/manual results | Agent logs, artifact updates, and status |
| `gate-check` | Check completion, artifact ownership, and overreach risk | Passed/failed quality gates |
| `report` | Summarize delivery state | Structured Markdown report |
| `finish` | Close the workflow | Closed run and archivable output |

## Profile Routing

| Profile | Trigger | Key rule |
| --- | --- | --- |
| `discovery` | Discovery, repository shape, module boundaries, technical direction | Discover and plan before implementation |
| `plan_only` | The user explicitly asks for planning only or no code | No-code gate is active; business code changes are blocked |
| `lite` | Narrow but still formal engineering work | Not a quick mode; tasks, delegation, and gates remain |
| `standard` | Normal implementation or multi-file work | Full loop |
| `full` | High-risk, broad, multi-stage work | Stronger requirements, architecture, tester, reviewer, and release gates |

Use dry-run to inspect routing:

```bash
npx crewup run --dry-run "Use CrewUp to plan module boundaries and technical direction for a large system. Do not write code."
```

## Run Naming

Run IDs use date + sequence + semantic slug. CrewUp first extracts action and object terms from the request, for example:

```text
plan-fullstack-blog-system
improve-readme
fix-auth
```

This avoids unreadable directory names made from truncated long prompts. If semantic detection fails, CrewUp falls back to a title slug.

## Artifact Schema In Tasks

Each subagent task includes the schema for the artifact it owns, such as owner, required headings, and forbidden terms. For `requirements-plan`, the task explicitly lists headings like:

```text
Original requirement summary
Historical background
Goals
Non-goals
Acceptance criteria
Impact candidates
Open questions
```

In generated Chinese artifacts, these are written as the configured Chinese headings. Putting schema into the task reduces repair loops after gate checks.

## Model Policy

Formal planning artifacts do not use the lowest tier:

| Role | Artifacts | Default model |
| --- | --- | --- |
| `requirements-plan` | `requirement-plan.md` | `gpt-5.4-mini` / medium |
| `requirements` | `requirement.md` | `gpt-5.5` / medium |
| `architect` | `architecture.md`, `implementation-plan.md` | `gpt-5.5` / medium |

## When Subagents Activate

| Subagent | Typical trigger | Artifact ownership |
| --- | --- | --- |
| `pm` | High-risk, cross-team, or product-tradeoff-heavy full runs | Requirement background, priority, product constraints |
| `requirements-plan` | Large, ambiguous, or multi-stage requests that need expansion first | requirement-plan |
| `requirements` | Incomplete scope, unclear requirements, acceptance criteria needed | requirement |
| `architect` | System design, cross-module changes, technical direction, migration plan | architecture / implementation-plan |
| `backend`, `frontend`, `database`, `devops` | Domain implementation or configuration changes | Domain execution result and handoff |
| `tester` | Test strategy, missing tests, verification evidence | test-report |
| `reviewer` | Quality, security, regression-risk review | review-report |
| `docs` | Documentation, guides, migration notes | docs artifact |
| `release` | Release preparation, change summary, archive | release-summary |

The main agent may prepare runs, create tasks, allocate context, check gates, and summarize state. It should not directly author primary requirements/architecture artifacts or complete business implementation when an implementation agent is available.

## Planning Run Order And Artifact Ownership

For requests like “plan a full-stack blog system; for this phase only clarify requirements, recommend technology choices, design directories and module boundaries, split development phases, and define acceptance criteria; do not write business code,” the normal flow is:

1. `crewup run` only creates the run, freezes input, prepares tasks, and writes the native subagent plan.
2. The main agent starts `requirements-plan` first and waits for it to write `artifacts/requirement-plan.md`.
3. After the `requirements-plan` result is captured in `native-state`, the main agent may start `requirements`, which writes `artifacts/requirement.md`.
4. After `requirements` completes, the main agent may start `architect`, which writes `artifacts/architecture.md` and `artifacts/implementation-plan.md`.
5. `reviewer` checks the planning artifacts and acceptance criteria last.

These formal artifacts must be written by their owner subagents. The main agent should not paste subagent-returned artifact bodies into artifact files. If the owner subagent cannot write successfully, ask it to repair the output or mark the run `blocked` / `needs_input`.

## Execution Paths

| Selected agent | Path | Behavior |
| --- | --- | --- |
| `codex` | native | CrewUp generates native subagent prompts and plans for Codex execution. |
| `claude` | bridge | CrewUp writes handoff files; Claude writes `result.json`; CrewUp collects it. |
| `cursor` | bridge | CrewUp writes handoff files; Cursor writes `result.json`; CrewUp collects it. |
| `trae` | bridge | CrewUp writes handoff files; Trae writes `result.json`; CrewUp collects it. |
| `manual` | bridge/manual | A human or script writes `result.json`; CrewUp collects it. |

## Self-Test Loop

```bash
npm run test:pack-install
npm run release:preflight
```

`test:pack-install` packs the current package and verifies install, inspect, init, check, profile dry-runs, a formal run, and report generation in a temporary project. `release:preflight` adds core checks, example tests, pack-install, and `npm pack --dry-run`.

## Closure Rules

Every formal run should leave:

1. Structured report
2. Verification evidence
3. Subagent handoff or result JSON
4. Clear completed, blocked, or archived state
