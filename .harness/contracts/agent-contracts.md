# Agent Contracts

## General Contract

- Each agent must stay inside its role, stage, and allowed write scope.
- Read current run `input.md` and relevant artifacts before changing files.
- Record uncertainty as questions or blockers; do not turn guesses into facts.
- Owned artifacts must be written to artifact files, not only returned in chat.

## Handoff Contract

- Upstream agents must record inputs, constraints, risks, and open questions.
- Downstream agents must confirm inputs are complete before execution.
- Missing upstream information should be recorded as blockers or `needs_input`.

## Skill Contract

- A skill is capability, not permission.
- Agents may use only skills needed for their current responsibility.
- Context7, Playwright, Figma, Browser, MCP tools, and plugins are optional enhancements, not hard harness dependencies.
- Use a tool only when the current session/tool list shows it is available.
- For library/framework/SDK/CLI/cloud docs, use Context7 when available; otherwise fall back to project docs, README, lock files, official docs links, or normal context analysis and record the fallback reason with `crewup tool-fallback <run-id>`.
- Tool fallback logs are evidence only. They do not transfer an owner agent's analysis or artifact-writing responsibility to the main agent.
