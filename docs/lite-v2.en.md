# CrewUp Lite Lightweight Flow

English | [中文](./lite-v2.md)

`lite` is the public explicit opt-in lightweight CrewUp flow. Internally it maps to the `lite-v2` profile. Its goal is to make low-risk, narrow tasks feel closer to OpenSpec: record a small spec and task list, let the main agent implement directly, record validation, and archive the run. It does not replace the existing strict workflow, and plain `crewup run "..."` is rejected because real runs must name a mode.

## When To Use It

Use `lite` for:

- UI styling, layout, copy, empty states, and mobile responsiveness.
- Single-module bug fixes.
- Small features, scripts, or documentation-linked changes that still need run evidence.
- Work where you want the main agent to execute directly instead of starting the full subagent audit chain.

Do not use `lite` for:

- Database schema, migrations, or real data changes.
- Auth, permissions, security, payments, production deploys, or CI/CD.
- Large features spanning multiple business modules.
- Work that needs complete requirements, architecture, tester, reviewer, and release audit evidence.

Use `strict` or `strict --risk=high` for those cases.

## How To Enable

`lite` must be explicitly requested:

```bash
npx crewup run --mode=lite "Fix the Admin article list mobile overflow and run build/test"
```

The old profile aliases are still accepted for compatibility:

```bash
npx crewup run --profile=lite-v2 "Fix a small UI issue"
npx crewup run --profile=lite_v2 "Fix a small UI issue"
```

In chat, say:

```text
Use CrewUp lite. Do not run the strict multi-agent audit flow. Only change frontend styles/interactions and finish build/test/preview-smoke.
```

Without `--mode=lite` or an explicit `lite` chat request, this lightweight path is not used.

## What It Generates

A `lite` run creates root-level lightweight files:

```text
.harness/runs/<run-id>/
  input.md
  spec.md
  tasks.md
  validation.md
  summary.md
  state.json
  RUN_STATUS.md
```

It does not create native subagent task files, and it does not create:

```text
logs/native-subagents/native-subagent-plan.json
```

## The Four Core Files

| File | Purpose |
| --- | --- |
| `spec.md` | Goal, scope, non-goals, acceptance criteria, risks |
| `tasks.md` | Implementation checklist, allowed scope, validation commands |
| `validation.md` | Build/test/lint/preview-smoke evidence |
| `summary.md` | Outcome, changed files, validation result, residual risks |

`validation.md` and `summary.md` must not remain in the pending template state. `finish` refuses to archive success until they are updated.

## Execution Order

Recommended order:

```text
run --mode=lite
  -> read spec.md/tasks.md
  -> implement directly in scoped files
  -> run validation commands
  -> update validation.md
  -> update summary.md
  -> crewup finish <run-id>
```

`lite` does not require `requirements-plan -> requirements -> architect -> tester -> reviewer -> release`.

## Closeout Rules

Successful closeout:

```bash
npx crewup finish <run-id>
```

`finish` checks that:

- `spec.md` exists.
- `tasks.md` exists.
- `validation.md` exists and is no longer pending.
- `summary.md` exists and is no longer pending.

Then it archives success:

```text
status=done
outcome=success
archived=true
```

If validation fails, do not force success. Record the failure in `validation.md` and `summary.md`, then repair or archive as blocked/partial as appropriate.

## Difference From Strict

| Capability | lite | strict |
| --- | --- | --- |
| Default enabled | No, explicit `--mode=lite` only | Explicit `--mode=strict` |
| Main agent writes business code | Allowed | Not allowed; owner agents required |
| Native subagents | Not created by default | Primary path |
| Owner artifact provenance | Not required | Required |
| Tester/reviewer/release | Not required | Required |
| Best for | Low-risk, narrow work | High-risk, cross-module, audited work |

## Stability Boundary

`lite` improves stability by reducing moving parts:

- No dependency on native subagent spawn/wait/result capture.
- No owner-artifact formatting gate for small tasks.
- No full repair loop for lightweight work.
- Small required files keep evidence out of chat memory.

It is not strict delivery proof. Use strict when auditability matters.

## Relation To Native Progress Checkpoints

`lite` does not normally create native subagents, so it usually does not use `progress.md`.

Strict still uses native subagents. To improve stability, each native subagent now receives:

```text
logs/native-subagents/<agent>.progress.md
```

Subagents should update it before long commands, before broad edits, and after meaningful milestones. `next-agent` uses last activity time to decide whether an agent is stale: recent progress means keep waiting; no result and no progress for too long means `action=stale`.

## Recommended Prompts

Lightweight UI:

```text
Use CrewUp lite. Do not run the strict multi-agent audit flow. Redesign the blog frontend UI, only change src/web and src/admin, finish build/test/preview-smoke, and update validation.md and summary.md.
```

Small bugfix:

```text
Use CrewUp lite to fix the Admin 390px horizontal overflow. Only change frontend layout/CSS, run relevant validation, then finish.
```

Strict task:

```text
Use CrewUp strict, high risk, to add comments, including database schema, API, Admin moderation, and frontend display. I need full requirements, architecture, implementation, testing, review, and release summary.
```

## Maintenance Rules

- Do not make `lite` the automatic default.
- Do not remove the existing strict workflow.
- Do not let `lite` skip validation evidence.
- Do not describe `lite` success as strict audit success.
