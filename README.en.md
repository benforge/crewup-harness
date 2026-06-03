# CrewUp

[中文](./README.md) | English

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp is an AI harness for large projects and rigorous delivery workflows. It is not a prompt bundle that asks one main agent to do everything. It is a workflow control protocol that defines when formal work starts, which role owns each artifact, who implements changes, which gates must pass, and how a run is reported and archived.

Its goal is simple: turn open-ended AI coding into a traceable, delegated, verifiable, and archivable engineering loop.

## Who It Is For

- Developers or teams that want a standardized AI development workflow
- Medium-to-large projects, long-running projects, complex refactors, full-stack systems, or multi-module repositories
- Users who want the main agent to stay in an orchestration role instead of writing requirements, architecture, implementation, and verification artifacts itself
- Teams that want one delivery protocol across Codex, Claude, Cursor, Trae, or manual execution

Tiny edits, one-off scripts, and casual Q&A usually do not need CrewUp. CrewUp is explicit opt-in, so installing it does not take over every chat.

## Architecture

CrewUp splits AI engineering work into three layers:

| Layer | Owns | Does not own |
| --- | --- | --- |
| Main Agent | Run creation, profile selection, task generation, subagent dispatch, result registration, gate checks, user summaries | Formal requirements, architecture, business code, test reports, review reports |
| Role Agents | Requirements, architecture, frontend, backend, database, DevOps, tester, reviewer, docs, release artifacts | Bypassing run state or writing artifacts owned by another role |
| Harness Gates | Entry checks, dependency order, artifact provenance, write scope, tester/reviewer feedback, service shutdown, archive readiness | Replacing the project's own tests, CI/CD, coding standards, or engineering judgment |

Default formal order:

```text
intake -> requirements_plan -> requirements_confirm -> plan
  -> implement -> verify -> review -> release -> done
```

A strict workflow does not skip roles just because a task is small. CrewUp reduces waste through clearer task contracts, more accurate routing, and fewer repair loops, not by turning the main agent back into an everything-doer.

## Core Capabilities

- Explicit activation: formal workflow starts only through `npx crewup run` or a clear chat request to use CrewUp / harness
- Main-agent boundary: the main agent orchestrates, checks, and summarizes; it does not write owner artifacts or business code
- Ordered dispatch: `next-agent` returns only subagents whose prerequisites are complete
- Artifact ownership: `requirement.md`, `architecture.md`, `implementation-plan.md`, `test-report.md`, and related artifacts must be written by their owner roles
- Schema-first tasks: subagent tasks include required headings and write contracts before execution
- Negation-aware routing: when the user explicitly excludes a scope, CrewUp avoids false-positive agents or high-risk classification; normally, requirements and architecture should decide which implementation agents are needed
- Chinese human-facing coordination: main/subagent summaries, handoffs, blockers, and status notes are Chinese by default
- English machine contracts: artifact headings, JSON fields, paths, commands, and status values stay in English to reduce encoding drift and false gate failures
- Feedback repair loop: tester/reviewer findings are routed back to implementation owners instead of being fixed directly by the main agent
- Auditable fallback: when optional tools such as Context7, MCP servers, or plugins are unavailable, `tool-fallback` records the fallback evidence in run logs
- Repair lineage: repair results preserve `repairOf`, `repairReason`, and `previousResultPath` to reduce repeated repair loops
- Runtime archive: runs, reports, dashboard, knowledge, and backlog state have explicit locations and preservation rules
- Safe upgrade: `install --force` updates the harness core while preserving existing runs, knowledge, project adapters, reports, dashboard, and backlog state

## Install

Install in a new or target project:

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

## Model Access And API Keys

CrewUp is a workflow harness. It does not include model credits, API keys, or a built-in subagent runtime.

For `codex` native mode, you need a Codex environment that can launch native subagents. Depending on how you use Codex, this may be a logged-in Codex Desktop / CLI session or API-backed automation. SDK/API paths and `inspect --ai` require `OPENAI_API_KEY`:

```bash
export OPENAI_API_KEY="sk-..."
```

On Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="sk-..."
```

For `claude`, `cursor`, and `trae`, CrewUp currently uses the Universal Agent Bridge. Those tools use their own login, API key, or subscription, then write CrewUp-compatible result JSON files back into the run directory.

For `manual`, no AI API key is required. CrewUp generates tasks, context, gates, and reports; a human or external tool executes the handoff and writes back results.

For existing projects, monorepos, or complex repository shapes, inspect first:

```bash
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
```

Upgrade an existing CrewUp installation:

```bash
npx crewup install --force
```

`--force` updates reusable `.harness` core files while preserving `.harness/runs/`, `.harness/knowledge/`, `.harness/project/`, `.harness/reports/`, `.harness/dashboard/`, and backlog state. Use reset only when you explicitly want to remove old runtime state and reinstall from scratch:

```bash
npx crewup install --reset
```

## Usage

CLI:

```bash
npx crewup run "Use CrewUp to plan and implement a todo MVP with requirements, architecture, frontend implementation, tester verification, reviewer review, and release summary. Keep the implementation small."
```

Chat:

```text
Use CrewUp to plan and implement a tiny Todo MVP. Keep the full flow: requirements, architecture, implementation, tester, reviewer, release. Let requirements and architecture confirm the scope, then dispatch implementation agents from the architecture plan.
```

When CrewUp is requested in chat, the main agent should run `npx crewup run "<user request>"`, extract the runId, then call `npx crewup next-agent <run-id>` and continue orchestration. Users do not need to manually create a runId first.

Requests without an explicit CrewUp signal remain normal assistant work.

## First Full-Flow Example

Use this small case to test the whole workflow without spending too much:

```text
Use CrewUp to build a tiny counter web app and run the full workflow. Acceptance criteria: page shows counter, initial value is 0, +1/-1/reset work, value persists after refresh, build/test pass. Scope: tiny frontend only; no backend, database, auth, or routing.
```

After the run is created, check orchestration:

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

More copy-ready prompts are in [examples/crewup-cases](./examples/crewup-cases/README.md).

If Chinese text appears garbled in a Windows terminal, run `npx crewup doctor` and check terminal encoding. CrewUp files are managed as UTF-8, and the main agent should use explicit UTF-8 reads for local documentation.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npx crewup doctor` | Check local environment and prerequisites |
| `npx crewup install` | Install the CrewUp harness template |
| `npx crewup install --force` | Safely upgrade harness core while preserving runtime state |
| `npx crewup inspect --no-ai` | Inspect project structure without AI |
| `npx crewup init --agent codex --yes` | Generate project adapter and runtime config |
| `npx crewup check` | Validate harness config, scripts, and templates |
| `npx crewup run "..."` | Create a formal run |
| `npx crewup run --dry-run "..."` | Preview naming, profile, and agent routing |
| `npx crewup next-agent <run-id>` | Show currently runnable subagents and blocked prerequisites |
| `npx crewup native-state <run-id> diagnose` | Diagnose native subagent handles, results, and state gaps |
| `npx crewup tool-fallback <run-id> --tool Context7 --reason "..." --fallback "..."` | Record optional tool fallback evidence |
| `npx crewup audit <run-id>` | Audit orchestration order, owner boundaries, repair loops, and context pressure |
| `npx crewup gate-check <run-id>` | Check gates, artifact ownership, and overreach risks |
| `npx crewup report <run-id>` | Generate a structured delivery report |
| `npx crewup finish <run-id>` | Finish and archive the run by policy |
| `npx crewup dashboard` | Generate or refresh `.harness/dashboard/index.html` |
| `npx crewup integrations status` | Show optional integration status, such as CodeGraph |
| `npx crewup dev-service <run-id> start` | Start a run-scoped preview service |
| `npx crewup dev-service <run-id> stop` | Stop the run-scoped preview service |

Prefer `npx crewup ...` in target projects because the user's `package.json` may not include `npm run harness:*` scripts.

For internal pipeline and maintenance commands, see [Script Map](./docs/script-map.en.md). Regular developers do not need to memorize every `.harness/scripts` file.

## Workflow Profiles

| Profile | Best for | Rule |
| --- | --- | --- |
| `discovery` | New-project discovery, module boundaries, technical direction | Discovery and planning only |
| `plan_only` | User explicitly asks for planning/no code | Business-code gate is active |
| `lite` | Narrow but formal engineering tasks | Still delegated and gated |
| `standard` | Normal multi-file engineering work | Full task, context, implementation, and verification loop |
| `full` | High-risk, broad, multi-stage, or explicitly strict work | Strong requirements, architecture, tester, reviewer, and release gates |

## When Subagents Start

Typical planning-to-development flow:

1. The main agent creates the run, freezes input, generates tasks, and writes the native plan.
2. `requirements-plan` writes `artifacts/requirement-plan.md`.
3. `requirements` writes `artifacts/requirement.md` after prerequisites are complete.
4. `architect` writes `artifacts/architecture.md` and `artifacts/implementation-plan.md` after requirements complete.
5. Implementation agents start according to impact scope, such as `frontend`, `backend`, `database`, `devops`, or `docs`.
6. `tester` verifies the result and writes `artifacts/test-report.md`.
7. `reviewer` reviews implementation, artifacts, risks, and test evidence.
8. `release` writes `artifacts/release-summary.md`, then the run can be reported and archived.

Normally, users should describe the goal and constraints; requirements/architect artifacts and impact scope should decide which implementation agents are needed. Negation-aware routing only applies when the user has explicitly excluded a scope, so CrewUp does not start irrelevant owner agents just to confirm they are irrelevant.

## Directory Layout

```text
.harness/
  AGENTS.md                # CrewUp entry contract
  orchestrator/            # Main agent, routing, native/bridge protocols
  config/                  # Workflow, model, gate, delegation, and write policies
  project/                 # Project adapter generated by init
  runs/                    # Per-run inputs, tasks, artifacts, and logs
  reports/                 # Delivery reports
  dashboard/               # Dashboard output
  knowledge/               # Lessons and reusable context
```

## Optional Integrations

CrewUp core does not require CodeGraph or any external code intelligence provider. Optional integrations can be inspected with:

```bash
npx crewup integrations status
```

CodeGraph is useful for large-codebase structure indexing and impact assistance. It does not replace `.harness/knowledge/`: CodeGraph is code-fact indexing, while knowledge files are project lessons, decisions, and retrospectives.

## Local Validation

```bash
npm run harness:check
npm test
npm run test:pack-install
npm run release:preflight
```

`release:preflight` runs harness validation, example tests, temporary-project pack-install flow tests, and `npm pack --dry-run`.

## More Docs

| Document | Topic |
| --- | --- |
| [Workflow](./docs/harness-workflow.en.md) | Command flow, profiles, and run lifecycle |
| [Getting Started](./docs/getting-started.en.md) | Install, API key setup, first run, and troubleshooting |
| [Local Testing](./docs/local-testing.en.md) | Test CrewUp locally with `npm pack` and a temporary project |
| [Universal Agent Bridge](./docs/universal-agent-bridge.en.md) | External-agent handoff and result JSON contract |
| [Agent Selection](./docs/harness-agent-selection.en.md) | Agent selection and adapter generation |
| [Agent Capabilities](./docs/harness-agent-capabilities.en.md) | Support levels, capability boundaries, and claims |
| [Core Boundary](./docs/harness-core-boundary.en.md) | Core, project adapter, and runtime boundaries |
| [Script Map](./docs/script-map.en.md) | Core entries, internal pipeline scripts, optional scripts, and consolidation direction |
| [Optional Integrations](./docs/optional-integrations.en.md) | Optional providers such as CodeGraph |
| [Extension Guide](./docs/harness-extension-guide.en.md) | Skills, policies, rules, and templates |

## Boundaries

CrewUp does not replace your framework, test runner, CI/CD, business architecture, or team conventions. It provides an AI collaboration and delivery-loop protocol. Real projects should keep their own README, test commands, release flow, and coding standards; CrewUp reads and follows that project evidence during initialization and runs.
