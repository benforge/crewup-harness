# CrewUp Troubleshooting

[中文](./troubleshooting.md) | English

This guide answers one practical question: when a CrewUp run looks stuck, confusing, or incomplete, where should you look and what is the next safe action?

## Start With explain

If you do not know whether a run is complete, blocked, waiting for the user, waiting for a subagent, or already closed, run:

```bash
npx crewup explain <run-id>
```

It reports:

- verdict: `SUCCESS`, `IN_PROGRESS`, `WAITING_USER`, `WAITING_AGENT`, `NEEDS_REPAIR`, `BLOCKED`, `PARTIAL`, `FAILED`, `CANCELED`
- status, stage, outcome, and archive state
- whether another agent is authorized
- whether owner repair is required
- gate/native-state issues
- the next safe action

When the main agent answers “is this run done / why is it stuck / what should I do next”, it should run this command first instead of relying on chat memory.

## Garbled Multilingual Text

CrewUp reads and writes files as UTF-8. If Chinese or other multilingual text appears garbled in PowerShell, cmd, remote terminals, or older terminal emulators, the issue is usually terminal rendering, not file corruption.

Verify the file with Node:

```bash
node -e "console.log(require('fs').readFileSync(process.argv[1], 'utf8'))" .harness/runs/<run-id>/RUN_STATUS.md
```

If Node renders it correctly while PowerShell/cmd does not, the problem is terminal rendering.

Windows one-time setup:

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

You can also run:

```bash
npx crewup doctor --encoding-help
npx crewup doctor --encoding-profile
```

Windows Terminal + PowerShell 7 is recommended. macOS/Linux terminals are usually UTF-8 by default; check with `locale`.

## Subagent Orchestration Stalls

Start with:

```bash
npx crewup explain <run-id>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
```

Common causes:

- an upstream agent has no real handle/result
- result files exist but were not captured with `mark-result` or `reconcile-results`
- an agent is still running and `next-agent` returns `action=wait`
- tester/reviewer requires fixes and `next-agent` returns `action=repair`
- bridge/manual mode did not write result JSON
- API keys or external agent login state are unavailable

If diagnostics say an agent ran too long without a captured result, resume that same subagent for a result-only closeout. Do not let the main agent write owner artifacts or business code.

## tester/reviewer Requires Repair

tester/reviewer findings must route back to owner agents. The main agent should not patch files directly.

Recommended sequence:

```bash
npx crewup native-state <run-id> reconcile-results
npx crewup repair-plan <run-id> --refresh
npx crewup next-agent <run-id>
```

Valid result statuses are only:

```text
completed
blocked
needs_input
```

When tester/reviewer has required fixes, use:

```json
{
  "status": "completed",
  "fixRequired": true,
  "targetAgents": ["frontend"],
  "requiredFixes": []
}
```

Do not write `status=fix-required`.

## Closed Runs Should Not Continue

If `crewup explain <run-id>` or `next-agent` shows:

```text
action=done
action=closed
```

the run is complete, canceled, failed, or archive-closed. Do not start more agents.

For UI, preview, deployment, login, or functional issues found later, create a continuation run:

```bash
npx crewup continue <run-id> "Fix the issue found after archive"
```

## blocked Does Not Mean Finished

A blocker should keep the run open by default:

```bash
npx crewup explain <run-id>
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

Only close a non-success run when the user explicitly abandons it, accepts partial completion, or wants to preserve a failed state:

```bash
npx crewup archive <run-id> --outcome=blocked --reason="..." --close
npx crewup archive <run-id> --outcome=partial --reason="..." --close
npx crewup cancel <run-id> --reason="scope changed"
```

## .harness Was Modified In A User Project

Business runs should not modify the CrewUp core:

```text
.harness/scripts/**
.harness/config/**
.harness/orchestrator/**
.harness/agents/**
.harness/templates/**
.harness/contracts/**
.harness/rules/**
```

If `npx crewup check` reports sealed core drift:

```bash
npx crewup install --force
npx crewup check
```

If this is a CrewUp product bug, fix it in the CrewUp source repository, test it, and publish an upgrade. Do not patch `.harness` inside a user's business run.
