import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const [command = "status", providerArg] = process.argv.slice(2);

if (!["status", "help", "--help", "-h"].includes(command)) {
  console.error(`Unknown integrations command: ${command}`);
  usage();
  process.exit(1);
}

if (["help", "--help", "-h"].includes(command)) {
  usage();
  process.exit(0);
}

const configPath = path.join(root, ".harness", "config", "integrations.yaml");
if (!existsSync(configPath)) {
  console.error(`Missing integrations config: ${path.relative(root, configPath)}`);
  process.exit(1);
}

const config = parseYaml(await readFile(configPath, "utf8"))?.integrations ?? {};
const entries = Object.entries(config)
  .filter(([id, item]) => !providerArg || id === providerArg || item?.provider === providerArg);

if (!entries.length) {
  console.error(`No integration found for: ${providerArg}`);
  process.exit(1);
}

console.log("# CrewUp Integrations");
console.log("");
console.log("| Integration | Provider | Enabled | Mode | Detected | Note |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const [id, item] of entries) {
  const detected = detectCommand(item?.commands?.detect);
  console.log(`| ${id} | ${item?.provider ?? "-"} | ${yesNo(item?.enabled)} | ${item?.mode ?? "optional"} | ${detected.ok ? "yes" : "no"} | ${detected.note} |`);
}
console.log("");
console.log("Optional integrations do not affect CrewUp gates unless a future project policy explicitly requires them.");

function detectCommand(commandText) {
  const parts = splitCommand(commandText);
  if (!parts.length) return { ok: false, note: "no detect command" };
  const result = runCommand(parts);
  if (result.status === 0) {
    const version = firstLine(result.stdout || result.stderr);
    return { ok: true, note: version || "available" };
  }
  return { ok: false, note: "optional provider not found" };
}

function splitCommand(commandText) {
  return String(commandText ?? "").match(/"[^"]+"|'[^']+'|\S+/g)?.map((part) => part.replace(/^["']|["']$/g, "")) ?? [];
}

function runCommand(parts) {
  if (process.platform !== "win32") {
    return spawnSync(parts[0], parts.slice(1), { cwd: root, encoding: "utf8" });
  }
  return spawnSync(parts.map(quoteShellArg).join(" "), {
    cwd: root,
    encoding: "utf8",
    shell: true
  });
}

function quoteShellArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9._~:/\\-]+$/.test(text)) return text;
  return `"${text.replaceAll('"', '\\"')}"`;
}

function firstLine(text) {
  return String(text ?? "").trim().split(/\r?\n/).find(Boolean) ?? "";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function usage() {
  console.error("Usage:");
  console.error("  npm run harness:integrations -- status [provider]");
  console.error("  npx crewup integrations status [provider]");
}
