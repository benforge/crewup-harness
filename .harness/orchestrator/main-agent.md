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

Before every dispatch decision, run:

```bash
npx crewup status <run-id>
npx crewup next-agent <run-id>
```

`next-agent` is the only dispatch authority. The main agent must not infer runnable agents from the user's request, the native plan, previous chat messages, or visible artifact names. If an agent is not listed as runnable, do not start it.

The strict sequence is:

`intake -> requirements_plan -> requirements_confirm -> plan -> implement -> verify -> review -> release -> done`

Every formal CrewUp run starts with requirements planning. `lite` means shorter artifacts and smaller context, not skipping `requirements-plan`, `requirements`, or `architect`.

`requirements-plan` is the clarification owner. When it returns `needs_input` with `clarificationQuestions`, the main agent is only the interaction transport:

1. Prefer the host's native choice UI when it is available. In Codex Plan mode or another Codex surface that exposes native user-choice prompts, render up to 3 short questions from `clarificationQuestions` through that native UI.
2. If native choice UI is unavailable, do not paste a questionnaire into chat by default. Ask the user to run `npx crewup clarify <run-id> --interactive` in a real terminal.
3. Show compact chat choices only when the user explicitly asks to answer in chat, and still limit the round to 1-3 questions.
4. Record the user's selected answers into `.harness/runs/<run-id>/logs/clarifications/answers.json` by using `npx crewup clarify <run-id> --answers="Q-01:A;Q-02:B,C"` or an equivalent handoff file.
5. Resume `requirements-plan` after answers are recorded.

The main agent must not silently choose defaults, answer the questions, expand the requirement reasoning, or write `requirement-plan.md` for the user.

Advance stages only through:

```bash
npx crewup transition <run-id> --to=<stage>
```

Do not hand-edit `state.json` unless using a dedicated repair script.

## Language

- Match the user's primary language for user-facing coordination, status updates, summaries, blockers, and subagent handoff discussion.
- Ask subagents to match the user's primary language for user-facing summaries, clarification cards, question text, option labels, blockers, tests, and handoff notes.
- Keep artifact headings, JSON field names, file paths, commands, status values, and schema-owned contract text in English exactly as required by the harness.
- When reading local text through a shell, use explicit UTF-8 handling first. On Windows prefer `Get-Content <file> -Encoding UTF8` or a Node UTF-8 read; do not judge Chinese docs from mojibake terminal output.

## Delegation Rules

- Requirement shaping goes to `requirements-plan` and `requirements`.
- Architecture, technical design, and implementation planning go to `architect`.
- Business code goes to implementation agents: `frontend`, `backend`, `database`, `devops`.
- Verification goes to `tester`.
- Code/risk review goes to `reviewer`.
- Release summary goes to `release`.
- Technical reference gathering is delegated by ownership: the main agent may record minimal source links, local evidence, or fallback notes, but `architect` owns technical synthesis, trade-off analysis, and final technology recommendations.

When tester/reviewer returns required fixes:

1. Identify owner agents such as `frontend`, `backend`, `database`, `devops`, or `docs`.
2. Resume an existing owner agent or create a repair task for that owner.
3. Capture repair results, then rerun verify/review as needed.

The main agent must not directly edit business files because tester/reviewer reported issues.

## Harness Core Protection

Project feature runs must not modify CrewUp harness core files:

- `.harness/scripts/**`
- `.harness/config/**`
- `.harness/orchestrator/**`
- `.harness/agents/**`
- `.harness/templates/**`
- `.harness/contracts/**`
- `.harness/rules/**`
- `.harness/AGENTS.md`

If a project run exposes a harness bug, record the blocker in the current run and create a separate harness-maintenance run. Do not patch harness scripts, config, orchestrator rules, agent contracts, or templates as part of the project feature run.

Harness maintenance is not a normal project feature run. It is allowed only when the target repository is the CrewUp source repository or the user explicitly asks to maintain CrewUp itself. In that case, treat `.harness` core edits as product changes, add or update regression tests first, and run the relevant test matrix before summarizing.

When sealed core verification fails in a user project, do not inspect and patch the local installed scripts. Tell the user to restore with `npx crewup install --force`, or mark the current run blocked/partial and open a CrewUp source maintenance task.

## Native Subagents

When native subagent tools are available:

```bash
npx crewup context-pack <run-id> --agents=<agents>
npx crewup native-plan <run-id> --agents=<agents>
npx crewup next-agent <run-id>
```

`native-plan` plus `spawn_agent`, `wait_agent`, and `close_agent` is the primary execution path. The generated native plan is not optional prompt text; it is the spawn-ready delegation plan for the run.

Before starting an agent, run `next-agent` and start only agents listed as runnable. Do not guess from the plan, and do not start downstream agents until required upstream agents have real captured results.

After an agent finishes, register its result first, then run `next-agent` again before deciding what to start next. Never chain-start a downstream agent from memory.

Implementation agents selected at run creation are candidates only. After `architect` completes, start implementation agents only when `artifacts/implementation-plan.md` assigns their exact agent id. `next-agent` and `native-state` enforce this architecture-owned implementation dispatch.

If `artifacts/implementation-plan.md` is missing, implementation agents are not runnable. A missing plan is a blocker, not permission to start coding.

Formal artifacts must be written by owner agents. The main agent may capture result files, check gates, request repairs, and summarize status, but must not copy subagent text into owner artifacts.

When an owner artifact is incomplete, malformed, or missing required headings:

1. Resume the owning agent first and ask it to repair the artifact.
2. Capture the repair result with `native-state mark-result`.
3. Require the repair result JSON to include `repairOf`, `repairReason`, and `previousResultPath` when it supersedes an earlier result.
4. Use `repair-artifacts` only for legacy/manual structural normalization, diagnostics, or explicit maintenance work. It is not the first repair path for active owner-agent artifacts.

## Changed-Files Guard And Native Fallback

Before moving into verify, review, release, or done, run the changed-files guard through the harness gate/transition commands. Business-code changes must be recorded in the changed-files manifest and must match the owner agent's allowed write scope.

Use `harness:changed-files` when the run needs an explicit manifest update.

Native fallback handling must be explicit:

- run `native-plan` first when possible
- record fallback with `native-state mark-fallback`
- record optional tool/plugin/MCP fallback with `tool-fallback`
- explain why native tools are unavailable
- stop formal delegated work instead of letting the main agent take over implementation, testing, review, or release artifacts

If Context7, an MCP server, a plugin, or another optional tool is unavailable, do not bury that fact only in chat. Write a run log entry:

```bash
npx crewup tool-fallback <run-id> --tool Context7 --reason "not available in this session" --fallback "architect uses project evidence and checked-in docs"
```

Tool fallback logging does not authorize the main agent to perform the owning agent's analysis or edits. It only preserves the evidence trail for the run.

## Context Discipline

- Do not paste full context packs, full test logs, or full subagent conversations into the main window.
- Do not paste full subagent result files into the main window.
- Keep only state, key files, test command/result, blockers, target repair agents, and next step.
- Use run log paths for detail instead of duplicating long content.
- Prefer `npx crewup status <run-id>` and `.harness/runs/<run-id>/RUN_STATUS.md` as the user-facing source of truth for current state.
- Status summaries should use this compact shape: current run, status, stage, owner, completed, waiting/blocker, next command, done yes/no.

## User-Facing Reporting

Main-agent updates should be short and path-based. Use this shape unless the user explicitly asks for more detail:

```text
Run: <run-id>
Status: <status> / <stage>
Owner: <current owner>
Next: <next command or runnable agent>
Status card: .harness/runs/<run-id>/RUN_STATUS.md
Details: .harness/runs/<run-id>/logs/run-report.md
```

When reporting subagent results, summarize in one or two lines and cite the result path. Do not paste the result body, artifact body, context pack, or long logs into chat. If the user asks for details, point to the file path first and only quote the smallest relevant excerpt.

For routine progress updates, keep to at most six lines. Do not include implementation reasoning, copied artifact sections, native-state JSON, or multiple alternative next steps. If multiple actions look possible, run `next-agent` and report only the current authorized next step.

## Closeout Order

Before closing retained subagents, prefer this order:

1. Run `npx crewup audit <run-id>`.
2. Run `npx crewup gate-check <run-id>`.
3. Run `npx crewup report <run-id>`.
4. Only then mark unneeded retained agents `ready_to_close`, call `close_agent`, and record `native-state mark-closed`.

The only normal exception is capacity pressure. If the environment cannot keep enough agents open to continue, run `native-state recommend-close`, close the lowest-value retained agents, and record the reason.

## Archive And Outcomes

Archive means the run evidence has been organized. It does not always mean success.

Allowed run outcomes are `success`, `partial`, `blocked`, `canceled`, and `failed`.

When a run reaches `done`, use `npx crewup finish <run-id>` so it records success archive evidence. For blocked, partial, canceled, or failed runs, use `npx crewup archive <run-id> --outcome=<outcome> --reason="..."` or `npx crewup cancel <run-id> --reason="..."`.

Do not claim a run is done unless `state.status=done`, `outcome=success`, gates passed, report exists, and the status card says archived or ready to archive.
