import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));

if (!runId) {
  console.error('Usage: crewup tool-fallback <run-id> --tool <name> --reason <reason> --fallback <method> [--agent <agent>] [--source <source>]');
  process.exit(1);
}

const options = parseOptions(args.filter((arg) => arg !== runId));
const tool = options.tool || options.name;
const reason = options.reason;
const fallback = options.fallback || options.method;
const agent = options.agent || "main";
const source = options.source || "chat";

if (!tool || !reason || !fallback) {
  console.error("Missing required fields: --tool, --reason, and --fallback are required.");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const logsDir = path.join(runDir, "logs");

if (!existsSync(runDir)) {
  console.error(`Run does not exist: ${runId}`);
  process.exit(1);
}

const entry = {
  recordedAt: new Date().toISOString(),
  runId,
  agent,
  tool,
  reason,
  fallback,
  source
};

await mkdir(logsDir, { recursive: true });
const jsonPath = path.join(logsDir, "tool-fallbacks.json");
const mdPath = path.join(logsDir, "tool-fallbacks.md");
const current = await readJson(jsonPath, { runId, entries: [] });
const next = {
  runId,
  entries: [...(Array.isArray(current.entries) ? current.entries : []), entry]
};

await writeFile(jsonPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
await writeFile(mdPath, renderMarkdown(next), "utf8");

console.log(`Tool fallback recorded: ${path.relative(root, jsonPath).replaceAll("\\", "/")}`);

function parseOptions(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (!item.startsWith("--")) continue;
    const raw = item.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      result[raw.slice(0, eq)] = raw.slice(eq + 1);
      continue;
    }
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      result[raw] = next;
      index += 1;
    } else {
      result[raw] = "true";
    }
  }
  return result;
}

async function readJson(target, fallback) {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function renderMarkdown(log) {
  const lines = [
    "# Tool Fallback Log",
    "",
    `- runId: ${log.runId}`,
    "",
    "## Entries",
    ""
  ];

  for (const item of log.entries ?? []) {
    lines.push(
      `### ${item.tool}`,
      "",
      `- recordedAt: ${item.recordedAt}`,
      `- agent: ${item.agent}`,
      `- source: ${item.source}`,
      `- reason: ${item.reason}`,
      `- fallback: ${item.fallback}`,
      ""
    );
  }

  if (!log.entries?.length) lines.push("- none", "");
  return `${lines.join("\n").trimEnd()}\n`;
}
