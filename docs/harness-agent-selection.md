# Agent Selection and Adapter Plan

CrewUp should not hard-code a single agent product as the only execution path.

## Goal

Let users choose the execution environment during `crewup init`, then generate only the matching adapter layer.

## Preferred UX

1. Run `crewup init`
2. Show an interactive list of supported agents
3. Let the user select one with arrow keys
4. Generate the shared harness core plus the selected adapter layer

## Non-interactive fallback

`crewup init --agent <name>` should bypass the prompt and use the selected agent directly.

## Recommended agent names

| Name | Meaning |
| --- | --- |
| `codex` | OpenAI Codex-style execution environment |
| `claude` | Claude Code-style execution environment |
| `cursor` | Cursor-style workflow bridge |
| `trae` | Trae-style workflow bridge |
| `manual` | Manual prompt handoff and shell-only fallback |

## Layering rule

- Shared workflow files stay reusable.
- Agent-specific launch, prompt, and lifecycle files live in an adapter layer.
- Unsupported features must degrade gracefully instead of breaking the workflow.

## Output rule

After init, CrewUp should always report:

- detected project shape
- selected agent
- generated shared files
- generated adapter files
- manual review notes when detection is uncertain

## Stability rule

Agent selection is a UI choice. The workflow core must stay stable even if an adapter changes or is unavailable.

See [harness-agent-capabilities.md](./harness-agent-capabilities.md) for the current support matrix.
