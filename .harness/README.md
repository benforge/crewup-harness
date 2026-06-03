# Harness Template

`.harness/` is the reusable CrewUp workflow layer. It can be installed into any target project and then adapted with `crewup init`.

## Boundaries

- `.harness/config/`, `.harness/agents/`, `.harness/rules/`, `.harness/contracts/`, `.harness/templates/`, and `.harness/scripts/` are reusable workflow core.
- `.harness/project/` is generated target-project adaptation.
- `.harness/runs/`, `.harness/reports/`, `.harness/knowledge/`, `.harness/dashboard/`, and `.harness/backlog/` are runtime/state directories.
- Project source code, product docs, application directories, package directories, and historical run output are not part of the reusable template.

## Initialize In A Target Project

Prefer the CLI in installed projects:

```bash
npx crewup doctor
npx crewup inspect --no-ai
npx crewup init --agent codex --yes
npx crewup check
```

Inside this source repository, package scripts are also available:

```bash
npm run harness:inspect -- --no-ai
npm run harness:init -- --agent codex --yes
npm run harness:check
```

## Core Workflow

```text
intake -> requirements-plan -> requirements -> architect
  -> implementation agents -> tester -> reviewer -> release -> done
```

The main agent coordinates, registers results, runs gates, and summarizes. Formal artifacts and business code are written by owner agents.

## Operational Notes

- Use `next-agent` before spawning any subagent.
- Record optional tool failures with `tool-fallback`.
- Route tester/reviewer fixes back to owner agents.
- Run `audit`, `gate-check`, and `report` before closing retained subagents when capacity allows.
- Use `repair-artifacts` only for maintenance/legacy normalization; active owner artifacts should be repaired by their owner agent first.
