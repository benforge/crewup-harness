import { spawnSync } from "node:child_process";

export function detectTerminalEncoding({ cwd = process.cwd() } = {}) {
  if (process.platform === "win32") return detectWindowsCodePage(cwd);
  return detectPosixLocale();
}

export function encodingHelpText() {
  return [
    "# CrewUp Encoding Help",
    "",
    "CrewUp stores text files as UTF-8. If terminal output is garbled but UTF-8 file reads are correct, the problem is terminal rendering, not file corruption.",
    "",
    "## Windows PowerShell / Windows Terminal",
    "",
    "One-time fix for the current terminal:",
    "",
    "```powershell",
    "chcp 65001",
    "[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()",
    "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "$OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "```",
    "",
    "Persistent profile snippet:",
    "",
    "```powershell",
    "chcp 65001 > $null",
    "[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()",
    "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "$OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "```",
    "",
    "Verify a file with an explicit UTF-8 read:",
    "",
    "```powershell",
    "node -e \"console.log(require('fs').readFileSync(process.argv[1], 'utf8'))\" .harness/runs/<run-id>/artifacts/requirement-plan.md",
    "```",
    "",
    "## macOS / Linux",
    "",
    "Most modern terminals are already UTF-8. Verify with:",
    "",
    "```bash",
    "locale",
    "```",
    "",
    "If your locale is not UTF-8, set one in your shell profile:",
    "",
    "```bash",
    "export LANG=en_US.UTF-8",
    "export LC_ALL=en_US.UTF-8",
    "```",
    "",
    "Verify a file with:",
    "",
    "```bash",
    "node -e \"console.log(require('fs').readFileSync(process.argv[1], 'utf8'))\" .harness/runs/<run-id>/artifacts/requirement-plan.md",
    "```"
  ].join("\n");
}

export function encodingProfileText() {
  if (process.platform === "win32") {
    return [
      "chcp 65001 > $null",
      "[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()",
      "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
      "$OutputEncoding = [System.Text.UTF8Encoding]::new()"
    ].join("\n");
  }
  return [
    "export LANG=en_US.UTF-8",
    "export LC_ALL=en_US.UTF-8"
  ].join("\n");
}

export function terminalEncodingWarning({ cwd = process.cwd() } = {}) {
  const encoding = detectTerminalEncoding({ cwd });
  return encoding.ok ? "" : encoding.warning;
}

function detectWindowsCodePage(cwd) {
  const result = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/c", "chcp"], {
    cwd,
    encoding: "utf8"
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const codePage = output.match(/(\d{3,5})/)?.[1] ?? "unknown";
  const ok = codePage === "65001";
  return {
    platform: "win32",
    value: codePage === "unknown" ? "unknown" : `CP${codePage}`,
    ok,
    note: ok ? "UTF-8 code page" : "Windows console code page; UTF-8 CP65001 is recommended",
    warning: ok ? "" : "Terminal may not render UTF-8 multilingual text correctly. Run `npx crewup doctor --encoding-help`."
  };
}

function detectPosixLocale() {
  const locale = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || "";
  const ok = /utf-?8/i.test(locale);
  const value = locale || "unknown";
  return {
    platform: process.platform,
    value,
    ok: ok || value === "unknown",
    note: ok ? "UTF-8 locale" : "UTF-8 locale is recommended for multilingual docs",
    warning: ok || value === "unknown" ? "" : "Terminal locale may not render UTF-8 multilingual text correctly. Run `npx crewup doctor --encoding-help`."
  };
}
