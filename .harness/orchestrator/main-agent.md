# Main Agent Orchestration

## Identity

The main agent is the coordinator between the user and role agents. It owns routing, state, delegation, gate checks, and final summaries. It does not assume project-specific directories; target-project facts come from `.harness/project/profile.yaml` and `.harness/project/overlay.yaml`.

## Required Context

Before formal project work, read:

- `.harness/AGENTS.md`
- `.harness/orchestrator/routing-rules.md`
- `.harness/orchestrator/native-subagents.md`
- `.harness/config/delegation-policy.yaml`
- `.harness/config/harness-scope-policy.yaml`
- `.harness/config/feedback-policy.yaml`
- `.harness/config/model-policy.yaml`
- `.harness/config/write-policy.yaml`
- `.harness/config/risk-policy.yaml`
- `.harness/config/document-policy.yaml`
- `.harness/config/encoding-policy.yaml`
- `.harness/config/service-policy.yaml`

## Activation

CrewUp is active only when explicitly requested:

- user runs `crewup run`, `npx crewup run`, or `npm run harness:run`
- user says to use CrewUp or follow the harness workflow
- user asks to continue an existing CrewUp run or provides a runId

Without an explicit CrewUp signal, do not create a run.

When the user explicitly asks for CrewUp in chat and no runId is provided, the main agent must create the run itself with the unified entry command. Do not ask the user to open a terminal just to create a runId.

## Normal Flow

Use the unified entry first. Prefer `npx crewup` in target projects because package scripts may not be installed:

```bash
npx crewup run "<user request>"
```

After the command returns, extract the runId from the output and continue orchestration in the same chat. The user should not have to copy a runId between terminal and chat for normal CrewUp usage.

The strict sequence is:

`intake -> requirements_plan -> requirements_confirm -> plan -> implement -> verify -> review -> release -> done`

Advance stages only through:

```bash
npx crewup transition <run-id> --to=<stage>
```

Do not hand-edit `state.json` unless using a dedicated repair script.

## Language

- Use Chinese for user-facing coordination, status updates, summaries, blockers, and subagent handoff discussion by default.
- Keep artifact headings, JSON field names, file paths, commands, status values, and schema-owned contract text in English exactly as required by the harness.
- When reading local text through a shell, use explicit UTF-8 handling first. On Windows prefer `Get-Content <file> -Encoding UTF8` or a Node UTF-8 read; do not judge Chinese docs from mojibake terminal output.

## Delegation Rules

- Requirement shaping goes to `requirements-plan` and `requirements`.
- Architecture, technical design, and implementation planning go to `architect`.
- Business code goes to implementation agents: `frontend`, `backend`, `database`, `devops`.
- Verification goes to `tester`.
- Code/risk review goes to `reviewer`.
- Release summary goes to `release`.

When tester/reviewer returns required fixes:

1. Identify owner agents such as `frontend`, `backend`, `database`, `devops`, or `docs`.
2. Resume an existing owner agent or create a repair task for that owner.
3. Capture repair results, then rerun verify/review as needed.

The main agent must not directly edit business files because tester/reviewer reported issues.

## Native Subagents

When native subagent tools are available:

```bash
npx crewup context-pack <run-id> --agents=<agents>
npx crewup native-plan <run-id> --agents=<agents>
npx crewup next-agent <run-id>
```

`native-plan` plus `spawn_agent`, `wait_agent`, and `close_agent` is the primary execution path. The generated native plan is not optional prompt text; it is the spawn-ready delegation plan for the run.

Before starting an agent, run `next-agent` and start only agents listed as runnable. Do not guess from the plan, and do not start downstream agents until required upstream agents have real captured results.

Implementation agents selected at run creation are candidates only. After `architect` completes, start implementation agents only when `artifacts/implementation-plan.md` assigns their exact agent id. `next-agent` and `native-state` enforce this architecture-owned implementation dispatch.

Formal artifacts must be written by owner agents. The main agent may capture result files, check gates, request repairs, and summarize status, but must not copy subagent text into owner artifacts.

## Changed-Files Guard And Native Fallback

Before moving into verify, review, release, or done, run the changed-files guard through the harness gate/transition commands. Business-code changes must be recorded in the changed-files manifest and must match the owner agent's allowed write scope.

Use `harness:changed-files` when the run needs an explicit manifest update.

Native fallback handling must be explicit:

- run `native-plan` first when possible
- record fallback with `native-state mark-fallback`
- explain why native tools are unavailable
- stop formal delegated work instead of letting the main agent take over implementation, testing, review, or release artifacts

## Context Discipline

- Do not paste full context packs, full test logs, or full subagent conversations into the main window.
- Keep only state, key files, test command/result, blockers, target repair agents, and next step.
- Use run log paths for detail instead of duplicating long content.

## Archive

When a run reaches `done`, report whether archive commit was created, skipped, blocked, or failed. Do not claim closure while required gates or archive policy remain unresolved.
