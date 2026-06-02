# Native Subagents Runner

This runner is the harness path for true multi-agent execution in Codex.

## What Counts As Native

Native subagents are created with Codex lifecycle tools:

```text
spawn_agent -> wait_agent / send_input -> close_agent
```

This is different from role prompts or generated desktop prompt files. Role prompts describe work; native subagents actually run with independent context and lifecycle.

Important: `npm run harness:native-plan` only writes spawn-ready prompt files and `native-state.json`. It does not and cannot start subagents by itself. The main agent must call the Codex `spawn_agent` tool for every required planned agent, then record the returned handle with `harness:native-state`.

## Main Agent Protocol

When native subagent tools are available and the user has not asked to avoid delegation, the main agent should prefer this path for formal project work:

1. Read `.harness/config/native-subagents.yaml`.
2. Refresh compact context:

```bash
npm run harness:knowledge
npm run harness:context-pack -- <run-id> --agents=<agent-list>
```

3. Generate native spawn plan:

```bash
npm run harness:native-plan -- <run-id> --agents=<agent-list>
```

4. Spawn only the agents that materially advance the current phase.
   - Do not spawn an agent whose `requires_completed_agents` are not completed and captured in `native-state.json`.
   - For planning runs, the normal order is `requirements-plan` -> `requirements` -> `architect` -> `reviewer`, unless the plan explicitly omits one of those roles.
5. Use `worker` agents only for implementation/test/devops/database work with clear write ownership.
6. Tell workers they are not alone in the codebase and must not revert edits made by others.
7. Before spawning more agents, check capacity:

```bash
npm run harness:native-state -- <run-id> status
npm run harness:native-state -- <run-id> recommend-close
```

8. If recommendations are printed, mark those agents `ready_to_close`, close them with `close_agent`, and record `mark-closed` before spawning replacements.
9. After every successful spawn, record the returned handle:

```bash
npm run harness:native-state -- <run-id> mark-spawned <agent> <handle>
```

10. While subagents run, do non-overlapping coordination work.
11. Wait only when the next critical-path step needs the result.
12. Require the subagent itself to save each result under:

```text
.harness/runs/<run-id>/logs/native-subagents/<agent>.result.md
.harness/runs/<run-id>/logs/native-subagents/<agent>.result.json
```

13. Mark the result:

```bash
npm run harness:native-state -- <run-id> mark-result <agent> <completed|blocked|needs_input>
```

The JSON result is the preferred machine-readable contract for reports and gates. The Markdown result remains the human-readable fallback and should still be saved for auditability.

The result file must exist before `mark-result`. A native handle without a saved `<agent>.result.md` is not enough for the main agent to produce a reliable final report. The main agent must not create or summarize `<agent>.result.md` / `<agent>.result.json` for the subagent; missing result files mean the main agent should ask the same subagent to write them, then only register them with `native-state`.

Owned artifacts must be written by the owner subagent, not authored in the main window. For example, `requirements-plan` writes `artifacts/requirement-plan.md`, `requirements` writes `artifacts/requirement.md`, and `architect` writes `artifacts/architecture.md` / `artifacts/implementation-plan.md`. The main agent may capture, summarize, gate, or request repair, but it must not become the artifact author when the owner agent exists.

14. Do not close a subagent immediately after a completed result. Mark the result and keep the agent in `waiting_review` until user acceptance, explicit release by the main agent, retention capacity pressure, or run done/archive cleanup, so follow-up changes can use `send_input` or `resume_agent` without respawning.
15. When the retained agent is no longer needed, mark it ready to close:

```bash
npm run harness:native-state -- <run-id> mark-ready-to-close <agent>
```

16. Close every `ready_to_close` or no-longer-needed blocked subagent.
17. Mark the close audit:

```bash
npm run harness:native-state -- <run-id> mark-closed <agent>
```

18. Confirm no stale running agents remain:

```bash
npm run harness:native-state -- <run-id> status
```

## Anti-Main-Agent-Takeover Gate

Formal delegated work must not be silently completed in the main window. Stage transitions enforce this:

- before `implement`: planned `requirements` / `architect` work must have native execution records.
- before `verify`: implementation agents such as `frontend`, `backend`, `database`, or `devops` must have native execution records.
- before `review`: `tester` must have a native execution record.
- before `release`: `reviewer` must have a native execution record.
- before `done`: `release` must have a native execution record.

If native tools are unavailable, do not continue as if delegation happened. Generate the native plan first, then record fallback and stop:

```bash
npm run harness:native-plan -- <run-id> --agents=<agents>
npm run harness:native-state -- <run-id> mark-fallback "native tools unavailable in this session"
```

## Runtime State

The native runner keeps lifecycle audit data in:

```text
.harness/runs/<run-id>/logs/native-subagents/native-state.json
```

The state file records each planned agent, the returned native handle, result capture time, close confirmation, and fallback reason. This file is an audit aid for the main agent; it does not spawn or close tools by itself.

## Retention And Reuse

Completed subagents are retained after a completed result by default:

```text
completed result -> waiting_review -> ready_to_close -> closed
```

If the user asks for changes while the agent is still retained, prefer `send_input` to the existing handle. If the handle is no longer active but the agent is not fully replaced yet, try `resume_agent` before spawning a new agent. Only spawn a replacement when the old agent is closed or cannot be resumed.

Result capture is not the close point. The close point is user acceptance, explicit release by the main agent, or run done/archive cleanup. Planning agents can still be released earlier if their artifacts are accepted and no follow-up discussion is expected, but they must first pass through `ready_to_close` and the close audit.

## Retention Capacity

Retention is bounded, not unlimited. The default pool keeps at most four `waiting_review` agents:

```text
max retained total: 4
max implementation agents: 2
max non-implementation agents: 2
```

When the pool is full, run:

```bash
npm run harness:native-state -- <run-id> recommend-close
```

The main agent should release recommended low-value retained agents before spawning more. This keeps the harness from exhausting native subagent slots while still preserving the most useful context for follow-up work.

## Fallbacks

If native subagent tools are unavailable, fall back in this order:

1. `harness:desktop-light`
2. `harness:desktop-plan`
3. `harness:orchestrate --dry-run`
4. blocked / waiting for real subagent execution

Fallback is a blocked state, not permission for the main agent to finish delegated work. When falling back, record the reason in the final summary or run logs and stop at the current stage until subagent execution is available or external agent results are captured.

Use the helper command when a run has already generated native state:

```bash
npm run harness:native-state -- <run-id> mark-fallback <reason>
```

After fallback is recorded, the main agent must not record business-code files in `harness:changed-files`, transition past the current delegated stage, or pass `harness:gate-check` for formal project work. The delegation guard intentionally blocks those paths until real subagent execution records exist or the business-code changes are removed.

## Output Contract

Each subagent final message must include:

```text
Agent:
Status: completed / blocked / needs_input
Summary:
Files changed:
Artifacts updated:
Tests:
Blockers:
Handoff:
```

The main agent summarizes these results back to the user as a table with agent, status, key output, changed files/artifacts, tests, blockers, target repair agents, and handoff.

If tester or reviewer feedback requires code changes, the main agent must route the feedback back to the owning implementation agent. It must not patch business files directly in the main window. Prefer `send_input` or `resume_agent` for the existing role handle; spawn a replacement only when reuse is impossible.
