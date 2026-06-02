# CrewUp

[中文](./README.md) | English

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp is an AI harness for large, formal engineering projects. It does not try to replace an agent with a magic coding shortcut. It defines when the harness is active, which role owns which artifact, who executes implementation work, which gates must pass, and how the run is reported and archived.

Think of it as the control layer for an AI engineering crew. The main agent stops growing into an everything-doer and instead behaves like a delivery lead: create the run, split the work, allocate context, wait for subagent results, check artifact ownership, and enforce gates. Requirements, architecture, implementation, testing, review, documentation, and release summaries are produced by the owning role agent or external runner.

The operating model is intentionally strict:

- Without an explicit `CrewUp`, `harness`, `crewup run`, or similar signal, the chat remains a normal assistant conversation.
- Once CrewUp is active, the main agent orchestrates, delegates, checks gates, and summarizes. It should not directly own formal business implementation or primary artifacts.
- Requirements, architecture, implementation, testing, review, docs, and release artifacts are owned by their corresponding subagents or external runners.
- CrewUp is built for large projects and rigorous workflows. Tiny edits, casual Q&A, and one-off scripts usually do not need it.

## Where It Fits

- Teams or individuals who want a standardized AI development workflow
- Projects that need one delivery protocol across Codex, Claude, Cursor, Trae, or manual execution
- Real repositories that need requirements, architecture, implementation, verification, review, release preparation, and archiving to close in a repeatable loop
- Large AI engineering workflows where the main agent must stay inside an orchestration role

## Core Capabilities

- Explicit opt-in: the strict harness only starts when the user asks for CrewUp/harness behavior
- Project adaptation: `inspect` reads the real repository, then `init` generates `.harness/project/`
- Strict delegation: the main agent routes, delegates, gates, and summarizes; role agents own artifacts
- Stage gates: stage entry gates, artifact provenance, and no-code profile gates reduce drift and overreach
- Multiple execution environments: Codex native first, with Claude/Cursor/Trae/manual writeback through the Universal Agent Bridge
- Release checks: local validation, temporary-project pack-install testing, and release preflight

## Quick Start

```bash
npm install -D crewup-harness
npx crewup install
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
npx crewup check
```

To upgrade a project that already has CrewUp installed, use the safe upgrade path:

```bash
npx crewup install --force
```

`--force` updates the reusable harness core while preserving `.harness/runs/`, `.harness/knowledge/`, `.harness/project/`, `.harness/reports/`, `.harness/dashboard/`, and backlog runtime state. Use `npx crewup install --reset` only when you explicitly want to remove the old harness state and reinstall from scratch.

If you have a model runtime configured and want AI-assisted project evidence refinement:

```bash
npx crewup inspect --ai
```

## Usage

Explicit CLI run:

```bash
npx crewup run "Use CrewUp to plan a payment-system refactor. Start with requirement boundaries, architecture, and staged delivery."
```

Explicit chat request:

```text
Use CrewUp for this large project: design module boundaries, migration stages, and acceptance gates. Do not write business code yet.
```

Non-explicit requests remain normal assistant work and should not automatically enter the CrewUp workflow.

## Workflow

```text
doctor -> install -> inspect -> init -> check -> run -> spec-freeze
  -> agent-plan -> orchestrate -> gate-check -> report -> finish
```

A formal run is split into three layers:

| Layer | Owns | Does not own |
| --- | --- | --- |
| Main agent | CrewUp activation, profile selection, run creation, task routing, gate checks, status summaries | Formal business implementation or primary artifacts owned by requirements/architect/tester/reviewer/docs/release |
| Subagents / external runners | Role artifacts, implementation changes, verification, review, risk notes, result writeback | Bypassing run state, artifact ownership, or write scopes |
| Harness gates | Explicit opt-in, stage transitions, artifact provenance, feedback repair, service shutdown, archive readiness | Replacing the project's own tests, build, CI/CD, or engineering standards |

Common commands:

| Command | Purpose |
| --- | --- |
| `npx crewup doctor` | Check runtime environment and prerequisites |
| `npx crewup install` | Install the CrewUp template into a target project |
| `npx crewup install --force` | Safely upgrade the harness core while preserving existing runs, knowledge, project adaptation, and runtime state |
| `npx crewup install --reset` | Clear and reinstall `.harness/`; deletes old runtime state and should be used only for explicit resets |
| `npx crewup inspect --no-ai` | Inspect project structure from the filesystem |
| `npx crewup init --agent codex --yes` | Generate project adapter and execution environment config |
| `npx crewup check` | Validate core config, scripts, and templates |
| `npx crewup run "..."` | Create and prepare a formal run |
| `npx crewup run --dry-run "..."` | Show routing/profile decisions without creating a run |
| `npx crewup agent-plan <run-id>` | Generate a native subagent plan or bridge handoff |
| `npx crewup gate-check <run-id>` | Check quality gates, artifact ownership, and overreach risks |
| `npx crewup report <run-id>` | Generate a structured delivery report |
| `npx crewup finish <run-id>` | Close the run and archive by policy |
| `npx crewup dashboard` | Generate or refresh `.harness/dashboard/index.html` |
| `npx crewup skills` | Report installed skills, role labels, and external candidates |
| `npx crewup dev-service <run-id> start` | Start a run-scoped dev/preview service and record its pid |
| `npx crewup dev-service <run-id> stop` | Stop the service started for the current run |

## Workflow Profiles

| Profile | Best for | Constraint |
| --- | --- | --- |
| `discovery` | New-project discovery, module boundaries, technical direction | Discovery and planning first, no direct implementation |
| `plan_only` | Requests that explicitly say plan only or no code | No-code gate is active; business code changes are forbidden |
| `lite` | Narrow formal engineering tasks | Not a quick mode; delegation and gates remain active |
| `standard` | Normal multi-file engineering work | Full task, context, execution, and verification loop |
| `full` | High-risk, broad, multi-stage project work | Stronger requirements, architecture, test, review, and release gates |

## Execution Environments

| Environment | Mode | Description |
| --- | --- | --- |
| `codex` | native | Generates Codex-native subagent tasks and plans; current stable main path |
| `claude` | bridge | Generates handoff; Claude executes and writes back `result.json` |
| `cursor` | bridge | Generates handoff; Cursor executes and writes back `result.json` |
| `trae` | bridge | Generates handoff; Trae executes and writes back `result.json` |
| `manual` | manual/bridge | A human or script writes back results by contract |

The bridge focuses on stable handoff and result writeback. It does not claim that every external tool has the same native multi-agent API.

## Key Directories

```text
.harness/
  AGENTS.md                # Entry point before formal project work
  orchestrator/            # Main agent, routing, and bridge protocols
  config/                  # Scope, workflow, model, gate, delegation, and write policy
  project/                 # Current-project adapter layer generated by init
  runs/                    # Per-run input, tasks, artifacts, and logs
  reports/                 # Runtime reports
  knowledge/               # Optional knowledge layer and lessons
```

## Release Validation

```bash
npm run harness:check
npm test
npm run test:pack-install
npm run release:preflight
```

`test:pack-install` packs the current project, installs it into a temporary empty project, then runs `crewup install -> inspect -> init -> check -> run --dry-run -> run -> report` to verify the real package installation path.

## Skill Enhancements

After installing CrewUp into a target project, use the CLI to manage optional skills:

```bash
npx crewup skills
npx crewup skills:install
npx crewup skills:resolve
npx crewup skills:install-exact
```

`skills.yaml` is a role-label and external-candidate registry. It does not mean those skills are installed. Most users only need `npx crewup skills` to inspect the report, then `npx crewup skills:install` if they want the configured external candidates.

## Feedback And Preview Services

When tester or reviewer feedback requires changes, the main agent routes that feedback back to the owning implementation agent. It should not directly edit business code. Feedback uses `fixRequired`, `targetAgents`, and `requiredFixes` to drive the repair loop.

For user-visible verification, start a run-scoped service:

```bash
npx crewup dev-service <run-id> start
npx crewup dev-service <run-id> status
npx crewup dev-service <run-id> stop
```

If the service is still running before `finish` / `done`, the gate blocks archive to avoid leftover processes.

## When The Dashboard Is Generated

`.harness/dashboard/` exists by default to reserve the runtime dashboard location. The actual page is:

```text
.harness/dashboard/index.html
```

It is generated or refreshed when:

- you run `npx crewup dashboard`
- `orchestrate` writes runtime status
- `finish <run-id>` reaches `done`

If you only created a run, but did not run `orchestrate` and have not finished it to `done`, the dashboard directory may contain only `.gitkeep`. That is expected.

## When The Docs Agent Runs

`docs` is not a fixed agent in every run. It starts when documentation is part of the deliverable, or when the implementation changes something users or maintainers need to know.

These requests trigger `docs`:

```bash
npx crewup run "Update README with install and startup instructions. Do not change source code."
npx crewup run "Implement login and update integration/configuration docs."
npx crewup run "Add a public API and document the endpoint and migration notes."
npx crewup run "Change startup commands and deployment steps; update the developer guide."
```

Typical trigger signals include:

- README, docs, documentation, usage guide, integration guide, configuration guide, developer guide, install guide
- public API, configuration changes, startup commands, deployment steps, migration notes
- user-visible behavior changes that need maintainer or user-facing explanation

If a run only changes internal implementation details and has no documentation impact, `docs` may stay inactive. In that case, the `release` agent records “no documentation changes” in `release-summary.md`. `release` owns the release summary; `docs` owns README/docs project documentation.

## More Docs

| Document | Topic |
| --- | --- |
| [Workflow](./docs/harness-workflow.en.md) | Command flow, profiles, and run lifecycle |
| [Universal Agent Bridge](./docs/universal-agent-bridge.en.md) | External-agent handoff and result JSON contract |
| [Agent Selection](./docs/harness-agent-selection.en.md) | Agent selection and adapter generation |
| [Agent Capabilities](./docs/harness-agent-capabilities.en.md) | Support levels, capability boundaries, and claims |
| [Core Boundary](./docs/harness-core-boundary.en.md) | Reusable core, project adapter, and runtime boundaries |
| [Iteration Log](./docs/harness-workflow-iteration-plan.md) | Design and change record for the strict workflow updates |
| [Extension Guide](./docs/harness-extension-guide.en.md) | Skills, policies, rules, and templates |

## Scope

CrewUp does not replace your build system, test framework, CI/CD, business architecture, or team conventions. It provides an AI collaboration and delivery-loop protocol. Real projects should keep their own README, test commands, release flow, and coding standards; CrewUp reads and references that information during initialization and runs.
