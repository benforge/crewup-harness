import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const runId = process.argv.find((arg, index) => index > 1 && !arg.startsWith("--"));

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:token-ledger -- <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`run 不存在：${path.relative(root, runDir)}`);
  process.exit(1);
}

const logsDir = path.join(runDir, "logs");
await mkdir(logsDir, { recursive: true });

const records = [];

await addFile(path.join(runDir, "input.md"), "run-input");
await addDirectory(path.join(runDir, "tasks"), "task", (name) => name.endsWith(".md"));
await addDirectory(path.join(runDir, "artifacts"), "artifact", (name) => name.endsWith(".md"));
await addDirectory(path.join(logsDir, "context"), "context-pack", (name) => name.endsWith(".md"));
await addDirectory(path.join(logsDir, "desktop-agents"), "desktop-prompt", (name) => name.endsWith(".md"));
await addDirectory(path.join(logsDir, "native-subagents"), "native-prompt", (name) => name.endsWith(".spawn.md") || name === "native-subagent-plan.md");
await addDirectory(path.join(logsDir, "native-subagents"), "native-result", (name) => name.endsWith(".result.md"));
await addFile(path.join(logsDir, "main-agent-summary.md"), "main-summary");

const summary = summarize(records);
const payload = {
  runId,
  generatedAt: new Date().toISOString(),
  estimate: {
    method: "ceil(chars / 3) for a rough mixed Chinese/English prompt estimate, not the real model bill.",
    totalChars: summary.totalChars,
    totalBytes: summary.totalBytes,
    estimatedTokens: summary.estimatedTokens
  },
  byKind: summary.byKind,
  largest: [...records].sort((left, right) => right.chars - left.chars).slice(0, 20),
  records
};

await writeFile(path.join(logsDir, "token-ledger.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(path.join(logsDir, "token-ledger.md"), renderMarkdown(payload), "utf8");

console.log(`Token ledger 已生成：.harness/runs/${runId}/logs/token-ledger.md`);
console.log(`- estimated_tokens: ${payload.estimate.estimatedTokens}`);
console.log(`- total_chars: ${payload.estimate.totalChars}`);

async function addDirectory(dir, kind, predicate) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !predicate(entry.name)) continue;
    await addFile(path.join(dir, entry.name), kind);
  }
}

async function addFile(target, kind) {
  if (!existsSync(target)) return;
  const content = await readFile(target, "utf8").catch(() => "");
  const info = await stat(target);
  const chars = content.length;
  records.push({
    path: path.relative(root, target).replaceAll("\\", "/"),
    kind,
    bytes: info.size,
    chars,
    estimatedTokens: estimateTokens(chars)
  });
}

function summarize(items) {
  const byKind = {};
  let totalBytes = 0;
  let totalChars = 0;
  for (const item of items) {
    totalBytes += item.bytes;
    totalChars += item.chars;
    byKind[item.kind] ??= { files: 0, bytes: 0, chars: 0, estimatedTokens: 0 };
    byKind[item.kind].files += 1;
    byKind[item.kind].bytes += item.bytes;
    byKind[item.kind].chars += item.chars;
    byKind[item.kind].estimatedTokens += item.estimatedTokens;
  }
  return {
    totalBytes,
    totalChars,
    estimatedTokens: estimateTokens(totalChars),
    byKind
  };
}

function renderMarkdown(data) {
  const lines = [
    "# Token Ledger",
    "",
    `- runId: ${data.runId}`,
    `- generatedAt: ${data.generatedAt}`,
    `- total_chars: ${data.estimate.totalChars}`,
    `- estimated_tokens: ${data.estimate.estimatedTokens}`,
    `- total_bytes: ${data.estimate.totalBytes}`,
    "",
    "## Estimation Method",
    "",
    data.estimate.method,
    "",
    "## Breakdown",
    "",
    "| Kind | Files | Chars | Estimated Tokens | Bytes |",
    "| --- | ---: | ---: | ---: | ---: |"
  ];

  for (const [kind, item] of Object.entries(data.byKind)) {
    lines.push(`| ${kind} | ${item.files} | ${item.chars} | ${item.estimatedTokens} | ${item.bytes} |`);
  }

  lines.push("", "## Largest Files", "", "| File | Kind | Chars | Estimated Tokens |", "| --- | --- | ---: | ---: |");
  for (const item of data.largest) {
    lines.push(`| \`${item.path}\` | ${item.kind} | ${item.chars} | ${item.estimatedTokens} |`);
  }

  lines.push("", "## Optimization Tips", "");
  if ((data.byKind["context-pack"]?.estimatedTokens ?? 0) > 3000) {
    lines.push("- context-pack is large; prefer a narrower allowed scope or pass `--agents=<agent>`.");
  }
  if ((data.byKind["desktop-prompt"]?.estimatedTokens ?? 0) > 3000 || (data.byKind["native-prompt"]?.estimatedTokens ?? 0) > 3000) {
    lines.push("- prompts are large; check artifact-index, project overlay, and role rules for unnecessary breadth.");
  }
  if (!lines.at(-1)?.startsWith("- ")) lines.push("- No obvious over-budget items right now.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function estimateTokens(chars) {
  return Math.ceil(chars / 3);
}
