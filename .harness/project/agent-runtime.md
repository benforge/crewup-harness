# Agent Runtime

This file records the selected runtime mode for the current project and the bridge contract used when the selected agent is not Codex-native.

## Modes

- `native`: Codex-native multi-subagent execution
- `bridge`: external agent bridge with manifest + JSON result writeback
- `manual`: human or shell fallback using the same bridge contract

## Contract

- `native` keeps the current subagent orchestration path.
- `bridge` generates handoff files and JSON result paths under `.harness/runs/<run>/logs/agent-bridge/`.
- `manual` uses the same files, but a human writes back the result payload.

## Commands

- `crewup agent-plan <run-id>` generates either a Codex native plan or Universal Bridge files.
- `crewup orchestrate <run-id>` collects native/API results or bridge `result.json` files.
- `crewup gate-check <run-id>` and `crewup finish <run-id>` should only run after required results are present.

## Selection Rule

The selected agent environment lives in `.harness/project/agent.yaml`.
