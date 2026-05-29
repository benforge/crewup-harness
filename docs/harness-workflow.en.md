# Harness Workflow

[中文](./harness-workflow.md) | English

## Main Flow

```text
doctor -> install -> inspect -> init -> check -> run -> agent-plan -> orchestrate -> gate-check -> report -> finish
```

## What Each Step Does

| Step | Purpose | Main output |
| --- | --- | --- |
| `doctor` | preflight check | environment and capability report |
| `install` | copy the reusable core into a target repo | `.harness/` and `AGENTS.md` |
| `inspect` | discover the real repo shape | project evidence and adaptation plan |
| `init` | generate the project adaptation layer | `.harness/project/*` |
| `check` | validate the harness install | config and script integrity report |
| `run` | start a work cycle | run state and planning artifacts |
| `agent-plan` | generate either Codex native plan or bridge handoff | native plan or `logs/agent-bridge/*` |
| `orchestrate` | collect SDK/native/bridge results | agent logs, artifacts, and status |
| `gate-check` | verify completion criteria | pass/fail quality gate |
| `repair-artifacts` | normalize required artifact sections | repaired test/review/release artifacts |
| `report` | summarize delivery state | structured Markdown report |
| `finish` | close the cycle | closed run and archive-ready output |

## Execution Paths

| Selected agent | Path | What happens |
| --- | --- | --- |
| `codex` | native | CrewUp prepares native subagent prompts and Codex executes them. |
| `claude` | bridge | CrewUp writes handoff files; Claude writes `result.json`; CrewUp collects it. |
| `cursor` | bridge | CrewUp writes handoff files; Cursor writes `result.json`; CrewUp collects it. |
| `trae` | bridge | CrewUp writes handoff files; Trae writes `result.json`; CrewUp collects it. |
| `manual` | bridge/manual | A human or script writes `result.json`; CrewUp collects it. |

## Request Format

When starting a new task, ask for:

- goal
- scope
- target stack
- constraints
- acceptance criteria
- what should not be touched

## Example

> Build a blog platform with a public frontend, an admin frontend, an API backend, and a database layer. First deliver the architecture, folder structure, data model, and phase plan. Do not implement the full product yet.

## Close Rule

Every run should end with:

1. a report
2. verification
3. a clear handoff
4. archive or commit status
