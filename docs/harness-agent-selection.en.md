# Agent Selection and Adapter Plan

[中文](./harness-agent-selection.md) | English

CrewUp should not hard-code a single agent product as the only execution path.

The mature default is:

```text
Codex native path + Universal Agent Bridge for everything else.
```

Codex remains the stable primary path. Claude, Cursor, Trae, and manual workflows connect through the bridge unless a future adapter has been proven native end to end.

## Goal

Let users choose the execution environment during `crewup init`, then generate only the matching adapter layer.

## Preferred UX

1. Run `crewup init`
2. Show an interactive list of supported agents
3. Let the user select one with arrow keys
4. Generate the shared harness core plus the selected adapter layer

## Non-interactive Fallback

`crewup init --agent <name>` bypasses the prompt and uses the selected agent directly.

## Recommended Agent Names

| Name | Meaning |
| --- | --- |
| `codex` | OpenAI Codex-style execution environment |
| `claude` | Claude bridge workflow |
| `cursor` | Cursor bridge workflow |
| `trae` | Trae bridge workflow |
| `manual` | Manual prompt handoff and shell-only fallback |

## Layering Rule

- Shared workflow files stay reusable.
- Agent-specific launch, prompt, and lifecycle files live in an adapter layer.
- Unsupported features must degrade gracefully instead of breaking the workflow.
- `model-policy.yaml` stays native/Codex-oriented; external tools own their own model selection.
- Bridge adapters must write back CrewUp-compatible `result.json` files before gates can be trusted.

## Output Rule

After init, CrewUp should always report:

- detected project shape
- selected agent
- generated shared files
- generated adapter files
- manual review notes when detection is uncertain

## Stability Rule

Agent selection is a UI choice. The workflow core must stay stable even if an adapter changes or is unavailable.

See [harness-agent-capabilities.en.md](./harness-agent-capabilities.en.md) for the current support matrix.
See [universal-agent-bridge.en.md](./universal-agent-bridge.en.md) for the bridge contract.
