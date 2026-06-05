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
