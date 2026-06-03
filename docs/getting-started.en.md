# Getting Started

[中文](./getting-started.md) | English

This guide is for developers using CrewUp for the first time. CrewUp is a workflow harness, not a model provider. It creates runs, generates role tasks, keeps the main agent inside an orchestration boundary, checks gates, and writes reports. Actual subagent execution comes from the agent environment you choose.

## Prerequisites

- Node.js 20 or newer
- npm, pnpm, or yarn
- A Git repository; `git init` is recommended for real projects
- An agent environment: Codex, Claude, Cursor, Trae, or Manual
- Model access configured for the chosen tool if you want AI subagents to run

## API Keys And Subagents

CrewUp does not include an OpenAI API key and does not create model accounts for users.

If you choose `codex`:

- Codex Desktop / Codex CLI can use native subagents when the environment supports them.
- SDK/API orchestration, `inspect --ai`, or OpenAI API based automation requires `OPENAI_API_KEY`.
- Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="sk-..."
```

- macOS / Linux:

```bash
export OPENAI_API_KEY="sk-..."
```

If you choose `claude`, `cursor`, or `trae`:

- The current path is bridge mode, not native multi-agent API support.
- CrewUp generates handoff files and result JSON contracts.
- The external tool uses its own login, API key, or subscription.
- After the external tool finishes, it must write back to `.harness/runs/<run-id>/logs/agent-bridge/<agent>.result.json`.

If you choose `manual`:

- No AI API key is required.
- CrewUp generates tasks, context, gates, and reports.
- A human or external tool executes the task and writes the result JSON.

## Install

In the target project:

```bash
npm install -D crewup-harness
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

For existing repositories or monorepos, inspect first:

```bash
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
```

Use AI-assisted inspection only after API access is configured:

```bash
npx crewup inspect --ai
```

## Check The Environment

```bash
npx crewup doctor
```

Look for:

- `.harness/` exists
- `.harness/project/profile.yaml` was generated
- `OPENAI_API_KEY` is set only when SDK/API mode or `inspect --ai` is needed
- selected agent environment matches what you expect

## Start A Run

CLI:

```bash
npx crewup run "Use CrewUp to build a tiny counter web app and run the full workflow. Acceptance criteria: page shows counter, initial value is 0, +1/-1/reset work, value persists after refresh, build/test pass. Scope: tiny frontend only; no backend, database, auth, or routing."
```

Chat:

```text
Use CrewUp to build a tiny counter web app and run the full workflow. Acceptance criteria: page shows counter, initial value is 0, +1/-1/reset work, value persists after refresh, build/test pass. Scope: tiny frontend only; no backend, database, auth, or routing.
```

When the user explicitly asks for CrewUp in chat, the main agent should run `npx crewup run "<request>"`, extract the runId, then continue orchestration with `next-agent`.

## Observe Dispatch

After you have a runId:

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

- `next-agent` shows which subagent is actually runnable now
- `audit` checks orchestration stability: premature starts, main-agent overreach, missing owner provenance, context pressure, and repair loops
- `gate-check` decides whether the current stage passes the quality gate

## Normal Order

```text
requirements-plan
  -> requirements
  -> architect
  -> implementation agents selected by implementation-plan.md
  -> tester
  -> reviewer
  -> release
```

Implementation agents are candidates at run creation time. The actual implementation dispatch should be decided by the architect-owned `artifacts/implementation-plan.md`.

## Finish And Archive

```bash
npx crewup report <run-id>
npx crewup finish <run-id>
```

If the run started a preview service:

```bash
npx crewup dev-service <run-id> stop
```

Before `finish`, make sure services are stopped, tester/reviewer issues are delegated back to owner agents, and `gate-check` passes.

## Troubleshooting

### Why did no subagent start?

Common reasons:

- the agent is not listed as runnable by `next-agent`
- upstream agent results do not have a real handle/result yet
- native subagent tooling is unavailable
- the project is in bridge/manual mode and needs handoff execution
- API key or external-tool login is not configured

### Can the main agent directly write business code?

Not in a formal CrewUp run. The main agent orchestrates, registers, checks, and summarizes. Business code and owner artifacts should be written by the owning subagent. `audit` and `gate-check` check overreach risk.

### What about Chinese encoding?

Machine-checked contracts use English headings, JSON fields, status values, and commands to reduce false gate failures. Human-facing summaries, handoffs, and blockers can be Chinese by default.

Run:

```bash
npx crewup doctor
```

If Windows terminal encoding is not CP65001, PowerShell may render Chinese text as mojibake. You can switch the current terminal with:

```powershell
chcp 65001
```

When reading files, prefer:

```powershell
Get-Content README.md -Encoding UTF8
```

or open the file in a UTF-8 aware editor. Inside the harness workflow, the main agent should use explicit UTF-8 reads before judging local documentation content.
