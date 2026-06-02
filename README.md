# CrewUp

English | [README.en.md](./README.en.md)

![CrewUp workflow](assets/crewup-hero.svg)

CrewUp is an AI harness for large, formal engineering projects. It keeps the main agent in an orchestration role and delegates formal requirements, architecture, implementation, testing, review, documentation, and release artifacts to owner agents.

CrewUp is intentionally strict:

- It is explicit opt-in. Normal chats do not enter the harness unless the user asks for CrewUp/harness behavior or runs `crewup run`.
- Once a run exists, the main agent coordinates, delegates, checks gates, and summarizes.
- Owner artifacts must be written by their owner agents.
- Tester/reviewer feedback must be routed back to implementation owner agents instead of being fixed directly by the main agent.
- Explicit strict/full-loop requests stay on the full workflow; CrewUp reduces waste by improving contracts and gates, not by bypassing roles.

## Highlights

- Explicit CrewUp activation and strict main-agent boundary
- Native subagent planning with `native-plan`, `spawn_agent`, `wait_agent`, and `close_agent`
- English/ASCII core contracts to avoid mojibake in scripts and Markdown agreements
- Schema-first artifact tasks with required headings
- Stable implementation write scopes, including frontend defaults such as `src/**` and `package.json`
- Tester baseline checks for frontend/local MVP runs
- Reviewer pass format standardized as `## Conclusion` + `- [x] pass`
- Native diagnostics with `crewup native-state <run-id> diagnose`
- Repair task generation with `crewup repair-plan <run-id>`
- Safe `install --force` upgrades that preserve runs, knowledge, project adapters, reports, dashboard, and backlog state

## Quick Start

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

For existing or complex repositories, inspect first:

```bash
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
```

To safely upgrade an existing installation:

```bash
npx crewup install --force
```

Use `--reset` only when you explicitly want to remove old harness runtime state and reinstall from scratch.

## Usage

CLI:

```bash
npx crewup run "Use CrewUp to plan and implement a formal feature with requirements, architecture, implementation, tester verification, reviewer review, and release summary."
```

Chat:

```text
Use CrewUp to do this large project work. Keep the full workflow: requirements, architecture, implementation, tester, reviewer, release.
```

Non-explicit requests remain normal assistant work.

## Workflow

```text
doctor -> install -> inspect -> init -> check -> run -> spec-freeze
  -> agent-plan -> native subagents / bridge -> gate-check -> report -> finish
```

Formal stage order:

```text
intake -> requirements_plan -> requirements_confirm -> plan
  -> implement -> verify -> review -> release -> done
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `npx crewup doctor` | Check runtime environment and prerequisites |
| `npx crewup install` | Install the reusable harness core |
| `npx crewup install --force` | Upgrade harness core while preserving runtime state |
| `npx crewup inspect --no-ai` | Inspect project structure without AI |
| `npx crewup init --agent codex --yes` | Generate project adapter and runtime config |
| `npx crewup check` | Validate harness config, scripts, and templates |
| `npx crewup run "..."` | Create and prepare a formal run |
| `npx crewup run --dry-run "..."` | Preview routing/profile decisions |
| `npx crewup agent-plan <run-id>` | Generate native subagent plan or bridge handoff |
| `npx crewup native-state <run-id> diagnose` | Diagnose native subagent state/results |
| `npx crewup repair-plan <run-id>` | Generate owner repair tasks from tester/reviewer fixes |
| `npx crewup gate-check <run-id>` | Check gates, provenance, and overreach risks |
| `npx crewup report <run-id>` | Generate a structured run report |
| `npx crewup finish <run-id>` | Close the run and archive by policy |
| `npx crewup dev-service <run-id> start` | Start a run-scoped dev/preview service |
| `npx crewup dev-service <run-id> stop` | Stop the run-scoped service |

## Workflow Profiles

| Profile | Trigger | Rule |
| --- | --- | --- |
| `discovery` | Project discovery, module boundaries, technical direction | Plan only |
| `plan_only` | User explicitly asks for planning/no code | Business code is blocked |
| `lite` | Narrow formal engineering work | Still delegated and gated |
| `standard` | Normal implementation or multi-file work | Full loop |
| `full` | High-risk, broad, multi-stage, or explicit strict/full-loop work | Strong requirements, architecture, tester, reviewer, release gates |

## Local Validation

```bash
npm run release:preflight
```

This runs harness checks, example tests, pack-install flow tests, and `npm pack --dry-run`.
