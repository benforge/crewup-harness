# CrewUp Troubleshooting

[中文](./troubleshooting.md) | English

## Garbled Multilingual Text In The Terminal

CrewUp reads and writes text files as UTF-8. If Chinese or other multilingual text appears garbled in PowerShell, cmd, remote terminals, or older terminal emulators, the issue is usually terminal rendering, not file corruption.

Typical symptom: Chinese text turns into unreadable mixed characters, symbols, or question marks in the terminal, while the same file looks correct in a UTF-8-aware editor.

## Check Whether The File Is Actually Valid

Read the file explicitly as UTF-8 with Node:

```bash
node -e "console.log(require('fs').readFileSync(process.argv[1], 'utf8'))" .harness/runs/<run-id>/artifacts/requirement-plan.md
```

If Node renders it correctly while PowerShell/cmd does not, the problem is terminal rendering.

## Windows Recommendation

Run:

```bash
npx crewup doctor
npx crewup doctor --encoding-help
```

One-time UTF-8 setup for the current terminal:

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

For a persistent PowerShell profile:

```powershell
notepad $PROFILE
```

```powershell
chcp 65001 > $null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

PowerShell 7 + Windows Terminal is recommended.

## macOS / Linux Recommendation

Most modern terminals are already UTF-8. Check with:

```bash
locale
```

If your locale is not UTF-8, set it in your shell profile:

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

## CrewUp's Policy

- Files and artifacts are written as UTF-8.
- Machine contracts, JSON keys, status values, commands, and paths stay in English.
- CLI output stays short and path-based when possible.
- Long multilingual content should live in Markdown files and be opened in an editor.
- `doctor` reports terminal encoding issues, but does not automatically modify the user's system profile.

## Subagent Orchestration Stalls

Start with:

```bash
npx crewup next-agent <run-id>
npx crewup native-state <run-id> diagnose
```

Common causes:

- the agent is not currently runnable
- an upstream agent has no real handle/result
- result files exist but were not captured with `mark-result`
- a bridge/manual agent did not write result JSON
- API keys or external agent login state are missing

If diagnostics say an agent has been running too long without a captured result, resume that same subagent for a result-only closeout. Do not let the main agent write owner artifacts or business code.

## The Run Is Archived But next-agent Looks Runnable

Use `status` and `gate-check` as the source of truth:

```bash
npx crewup status <run-id>
npx crewup gate-check <run-id>
```

If the run is `done / success / archived` and the gate passes, the run is closed. Do not start more agents; create a continuation run for follow-up work or bugs found after archive.

Starting in CrewUp 0.3.20, `next-agent` returns `action=done|closed`, `next=null`, and `runnable=[]` for closed or archived runs.

## Result Files Changed But The Run Still Loops In repair-plan

This usually means a subagent overwrote its `*.result.json`, but native-state still has the older capture timestamp. Use:

```bash
npx crewup native-state <run-id> diagnose
npx crewup native-state <run-id> reconcile-results
npx crewup next-agent <run-id>
```

If it still stalls, ask the owning subagent for a result-only closeout and then recapture:

```bash
npx crewup native-state <run-id> mark-result <agent> completed .harness/runs/<run-id>/logs/native-subagents/<agent>.result.md
npx crewup next-agent <run-id>
```

Starting in CrewUp 0.3.20, `mark-result` and `reconcile-results` refresh the capture timestamp when the same result file path has newer contents, preventing stale repair-plan timeline loops.

## tester/reviewer Wrote An Invalid status

Valid result statuses are only:

```text
completed
blocked
needs_input
```

If tester/reviewer found required fixes, do not write `fix-required`. Use:

```json
{
  "status": "completed",
  "fixRequired": true,
  "targetAgents": ["frontend"],
  "requiredFixes": []
}
```

Then run:

```bash
npx crewup native-state <run-id> mark-result tester completed
npx crewup repair-plan <run-id> --refresh
npx crewup next-agent <run-id>
```
