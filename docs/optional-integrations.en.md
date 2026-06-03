# Optional Integrations

[中文](./optional-integrations.md) | English

CrewUp's default workflow does not require external code intelligence tools. Optional integrations are advanced helpers for large repositories, not core harness dependencies.

## Principle

```text
CrewUp decides who is allowed to act.
Optional integrations help agents know where to look.
```

CrewUp still owns:

- explicit activation
- run state
- subagent ordering
- artifact ownership
- `next-agent`
- `native-state`
- `gate-check`
- `repair-plan`

Optional integrations may help with:

- symbol lookup
- callers and callees
- dependency direction
- impacted files
- module boundary discovery

## CodeGraph

CodeGraph can be used as an optional local code intelligence provider for large codebases. It should not be installed or initialized automatically by CrewUp.

Recommended positioning:

- default users: ignore it
- large repositories: enable it manually when code exploration cost is high
- architect/implementation/tester/reviewer agents: use it before broad file reads

Do not write full graph outputs into `.harness/knowledge/`. If a run uses CodeGraph, keep short summaries under:

```text
.harness/runs/<run-id>/logs/code-intelligence/
```

Only stable project lessons should be promoted into `.harness/knowledge/`.

## Check Status

```bash
npx crewup integrations status
npx crewup integrations status codegraph
```

This command only reports optional provider status. Missing optional providers do not fail CrewUp checks or gates.

## Configuration

Optional integration declarations live in:

```text
.harness/config/integrations.yaml
```

By default, CodeGraph is declared but disabled:

```yaml
integrations:
  code_intelligence:
    enabled: false
    provider: codegraph
    mode: optional
```

Keep integrations optional unless a target project explicitly chooses a stricter policy.
