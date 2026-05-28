# Eff Harness

Default language: [中文](./README.md) | English

Eff Harness is a reusable AI collaboration workflow layer for standardizing requirement decomposition, context management, sub-agent coordination, quality gates, delivery summaries, and archive commits. It is framework-agnostic and does not require an `apps/`, `packages/`, or monorepo layout.

It is designed for developers and teams who want stable AI agent workflows inside real engineering repositories: every iteration gets clear input, role separation, execution records, quality checks, and an archive path.

## Install

```bash
npm install -D eff-harness
```

After installation, the short command `eh` is recommended:

```bash
npx eh install
```

`eff-harness` is the npm package name and full CLI name; `eh` is the daily short command; `harness` remains as a compatibility alias for older scripts.

## Quick Start

Run this at the root of your target project:

```bash
npx eh install
npx eh inspect --no-ai
npx eh init --force
npx eh check
```

These commands install `.harness/` and `AGENTS.md`, inspect the real project tree, generate the `.harness/project/` adapter layer, and validate the core configuration.

## Workflow

```text
intake -> backlog -> run -> context-pack -> native-plan
       -> subagents -> verify -> review -> release -> done -> archive
```

Common commands:

```bash
npx eh run "Implement now: ..."
npx eh status
npx eh next <run-id>
npx eh report <run-id>
npx eh gate-check <run-id>
npx eh finalize <run-id>
```

`run` creates or prepares a run based on task complexity and generates a sub-agent plan. `finalize` attempts to move the run to `done` and triggers a git commit according to the archive policy after passing the gate.

## Runtime Modes and Authentication

| Mode | Entry | Requires `OPENAI_API_KEY` | Notes |
| --- | --- | --- | --- |
| Native Codex sub-agents | `native-plan` followed by `spawn_agent` from the main agent | No extra setup | Uses the current Codex session and host tools. |
| Node SDK/API | `inspect --ai`, `orchestrate` without `--dry-run` | Yes | A terminal Node process calls the OpenAI SDK directly and cannot read the Codex Desktop login state. |
| Static / heuristic | `inspect --no-ai`, `check`, `report` | No | Reads local files and config only, without model calls. |

AI-assisted project inspection:

```bash
npx eh inspect --ai
```

PowerShell:

```powershell
$env:OPENAI_API_KEY="your_api_key"
npx eh inspect --ai
```

macOS/Linux:

```bash
OPENAI_API_KEY="your_api_key" npx eh inspect --ai
```

## Automatic Git Commit

Automatic commits are controlled by `.harness/config/archive-policy.yaml`. By default, a commit only happens after a run reaches `done`, and only the current run, the source backlog file, and files recorded in the `changed-files` manifest are staged.

```bash
npx eh archive-commit <run-id> --dry-run
npx eh finalize <run-id>
```

If a commit is blocked, register the change first:

```bash
npx eh changed-files <run-id> add <file...>
npx eh archive-commit <run-id>
```

## Report Output

`report <run-id>` generates a structured Markdown report with tables for agent name, type, execution status, result files, summary, changes, tests, blockers, and handoff notes.

## Directory Structure

```text
.harness/
  agents/          # Role definitions
  backlog/         # Requirement queue
  config/          # Workflow, model, delegation, risk, and archive policies
  knowledge/       # Regenerable knowledge-layer index
  orchestrator/    # Main-agent routing rules
  project/         # Current-project adapter layer
  reports/         # Runtime reports
  runs/            # Per-iteration run data
  scripts/         # CLI and workflow scripts
  templates/       # Artifact templates
AGENTS.md          # Repository-level agent entry
```

In a target project, it is recommended to commit the workflow core under `.harness/`, plus `.harness/project/profile.yaml`, `.harness/project/overlay.yaml`, `AGENTS.md`, `README.md`, and `package.json`. The Eff Harness template package itself does not ship project-specific `.harness/project/*.yaml` files; they are generated inside the target project by `eh init`.

It is usually not recommended to commit `.harness/runs/*`, `.harness/reports/*`, `.harness/dashboard/*`, `.harness/project/inspect.json`, `.harness/project/adapter-plan.json`, or temporary smoke-test backlog files.

## Pre-release Checks

```bash
npm run harness:check
node bin/harness.mjs --help
npm pack --dry-run
```

Key checks:

- `package.json` `name` is `eff-harness`
- `author` is `Ben`
- `version` matches the current release stage
- `bin.eh`, `bin.eff-harness`, and `bin.harness` all point to `./bin/harness.mjs`
- the npm tarball does not include old business projects, historical runs, or temporary test artifacts

## Scope

Eff Harness does not replace your build system, test framework, or business architecture. It provides an AI collaboration and delivery loop protocol. Real projects should keep their own README, test commands, CI/CD, release flow, and coding standards; Harness reads and references that information through `.harness/project/`.
