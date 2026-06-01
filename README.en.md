# CrewUp

[中文](./README.md) | English

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp is an AI harness for large, formal engineering projects. It does not try to replace an agent with a magic coding shortcut. It defines when the harness is active, which role owns which artifact, who executes implementation work, which gates must pass, and how the run is reported and archived.

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

Common commands:

| Command | Purpose |
| --- | --- |
| `npx crewup doctor` | Check runtime environment and prerequisites |
| `npx crewup install` | Install the CrewUp template into a target project |
| `npx crewup inspect --no-ai` | Inspect project structure from the filesystem |
| `npx crewup init --agent codex --yes` | Generate project adapter and execution environment config |
| `npx crewup check` | Validate core config, scripts, and templates |
| `npx crewup run "..."` | Create and prepare a formal run |
| `npx crewup run --dry-run "..."` | Show routing/profile decisions without creating a run |
| `npx crewup agent-plan <run-id>` | Generate a native subagent plan or bridge handoff |
| `npx crewup gate-check <run-id>` | Check quality gates, artifact ownership, and overreach risks |
| `npx crewup report <run-id>` | Generate a structured delivery report |
| `npx crewup finish <run-id>` | Close the run and archive by policy |
| `npx crewup skills` | Report installed skills, role labels, and external candidates |

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
