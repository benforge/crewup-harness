import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const urls = collectUrls(args);
const timeoutMs = Number(valueOf("--timeout-ms=") ?? 8000);

if (!runId || urls.length === 0) {
  console.error("Usage: npx crewup preview-smoke <run-id> --url=http://localhost:3000 [--url=http://localhost:3000/admin]");
  console.error("Or:    npx crewup preview-smoke <run-id> --urls=http://localhost:3000,http://localhost:4000/health");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const startedAt = new Date().toISOString();
const results = [];
for (const url of urls) {
  results.push(await checkUrl(url, timeoutMs));
}

const passed = results.every((item) => item.ok);
const finishedAt = new Date().toISOString();
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");
await mkdir(artifactsDir, { recursive: true });
await mkdir(logsDir, { recursive: true });

const json = {
  runId,
  status: passed ? "passed" : "failed",
  startedAt,
  finishedAt,
  timeoutMs,
  urls: results
};
await writeFile(path.join(logsDir, "preview-smoke.json"), `${JSON.stringify(json, null, 2)}\n`, "utf8");
await writeFile(path.join(artifactsDir, "preview-smoke.md"), renderMarkdown(json), "utf8");

console.log(`Preview smoke ${json.status}: .harness/runs/${runId}/artifacts/preview-smoke.md`);
for (const result of results) {
  console.log(`- ${result.ok ? "pass" : "fail"} ${result.url} ${result.status ?? result.error}`);
}
process.exit(passed ? 0 : 1);

async function checkUrl(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "crewup-preview-smoke"
      }
    });
    return {
      url,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - started
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error?.name === "AbortError" ? `timeout after ${timeout}ms` : (error?.message ?? "request failed"),
      durationMs: Date.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

function collectUrls(values) {
  const urls = [];
  for (let index = 0; index < values.length; index += 1) {
    const arg = values[index];
    if (arg.startsWith("--url=")) urls.push(arg.slice("--url=".length));
    if (arg.startsWith("--urls=")) urls.push(...arg.slice("--urls=".length).split(","));
    if (arg === "--url" && values[index + 1]) urls.push(values[index + 1]);
    if (arg === "--urls" && values[index + 1]) urls.push(...values[index + 1].split(","));
  }
  return [...new Set(urls.map((item) => item.trim()).filter(Boolean))];
}

function renderMarkdown(result) {
  return [
    "# Preview Smoke",
    "",
    "## Run",
    "",
    `- runId: ${result.runId}`,
    `- status: ${result.status}`,
    `- startedAt: ${result.startedAt}`,
    `- finishedAt: ${result.finishedAt}`,
    `- timeoutMs: ${result.timeoutMs}`,
    "",
    "## Checked URLs",
    "",
    "| URL | Result | Status | Duration | Error |",
    "| --- | --- | --- | ---: | --- |",
    ...result.urls.map((item) => `| ${cell(item.url)} | ${item.ok ? "passed" : "failed"} | ${item.status ?? "-"} | ${item.durationMs}ms | ${cell(item.error ?? "")} |`),
    "",
    "## Next Step",
    "",
    result.status === "passed"
      ? "- Preview endpoints responded successfully. Include this file in release/closeout evidence."
      : "- Preview smoke failed. Route the issue to the owning implementation or devops agent; the main agent must not patch business code directly.",
    ""
  ].join("\n");
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}
