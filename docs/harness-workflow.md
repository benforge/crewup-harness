# Harness Workflow

## Main flow

```text
doctor -> install -> inspect -> init -> check -> run -> plan -> verify -> review -> finish
```

## What each step does

| Step | Purpose | Main output |
| --- | --- | --- |
| `doctor` | preflight check | environment and capability report |
| `install` | copy the reusable core into a target repo | `.harness/` and `AGENTS.md` |
| `inspect` | discover the real repo shape | project evidence and adaptation plan |
| `init` | generate the project adaptation layer | `.harness/project/*` |
| `check` | validate the harness install | config and script integrity report |
| `run` | start a work cycle | run state and planning artifacts |
| `finish` | close the cycle | closed run and archive-ready output |

## Request format

When starting a new task, ask for:

- goal
- scope
- target stack
- constraints
- acceptance criteria
- what should not be touched

## Example

> Build a blog platform with a public frontend, an admin frontend, an API backend, and a database layer. First deliver the architecture, folder structure, data model, and phase plan. Do not implement the full product yet.

## Close rule

Every run should end with:

1. a report
2. verification
3. a clear handoff
4. archive or commit status
