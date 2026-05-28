import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const outPath = path.join(root, ".harness", "reports", "skills.md");
const resolvePath = path.join(root, ".harness", "reports", "skills-resolve.json");
const installResultsPath = path.join(root, ".harness", "reports", "skills-install-results.json");
const config = parseYaml(await readFile(path.join(root, ".harness", "config", "skills.yaml"), "utf8"));
const installed = readInstalledSkills();
const installedByName = new Map(installed.map((item) => [item.name, item]));
const resolved = readJson(resolvePath, []);
const installResults = readJson(installResultsPath, []);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, renderReport(), "utf8");

console.log(`Skill report written: ${path.relative(root, outPath)}`);

function readInstalledSkills() {
  try {
    const output = execSync("npx skills list --json", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return JSON.parse(output);
  } catch (error) {
    const message = error.stderr?.toString() || error.message;
    return [{ name: "__error__", path: message, scope: "error", agents: [] }];
  }
}

function renderReport() {
  const roleSkills = config.role_skills ?? {};
  const candidates = config.external_skill_candidates ?? {};
  const lines = [
    "# Harness Skill Report",
    "",
    "This report separates internal harness skill labels from external skills that can be installed with `npx skills add`.",
    "",
    "## Installed Project Skills",
    ""
  ];

  const realInstalled = installed.filter((item) => item.name !== "__error__");
  if (realInstalled.length === 0) {
    lines.push("- None detected by `npx skills list --json`.");
  } else {
    for (const item of realInstalled) {
      lines.push(`- ${item.name}: ${item.path}`);
    }
  }

  lines.push("", "## External Installable Candidates", "");
  for (const [name, item] of Object.entries(candidates)) {
    const installedItem = installedByName.get(name);
    lines.push(`### ${name}`);
    lines.push(`- installed: ${installedItem ? "yes" : "no"}`);
    lines.push(`- roles: ${(item.roles ?? []).join(", ") || "none"}`);
    lines.push(`- ref: ${item.marketplace_ref ?? item.source ?? "unknown"}`);
    if (item.install_command) lines.push(`- install: \`${item.install_command}\``);
    if (installedItem?.path) lines.push(`- path: ${installedItem.path}`);
    if (item.use_when) lines.push(`- use when: ${item.use_when}`);
    lines.push("");
  }

  lines.push("## Harness Role Skill Labels", "");
  lines.push("These are routing/context labels used by harness prompts. They are not automatically installable unless they also appear above with an install command.");
  lines.push("");

  for (const [role, skills] of Object.entries(roleSkills)) {
    lines.push(`### ${role}`);
    for (const skill of skills ?? []) lines.push(`- ${skill}`);
    lines.push("");
  }

  if (resolved.length > 0) {
    const exact = resolved.filter((item) => item.exact);
    const approximate = resolved.filter((item) => !item.exact && item.first);
    const missing = resolved.filter((item) => !item.exact && !item.first);

    lines.push("## Marketplace Resolution", "");
    lines.push(`- exact matches: ${exact.length}`);
    lines.push(`- approximate-only matches: ${approximate.length}`);
    lines.push(`- no results: ${missing.length}`);
    lines.push("");

    if (approximate.length > 0) {
      lines.push("### Approximate Only");
      for (const item of approximate) lines.push(`- ${item.label}: first result ${item.first.ref}`);
      lines.push("");
    }

    if (missing.length > 0) {
      lines.push("### No Marketplace Results");
      for (const item of missing) lines.push(`- ${item.label}`);
      lines.push("");
    }
  }

  if (installResults.length > 0) {
    const installedResults = installResults.filter((item) => item.status === "installed");
    const failed = installResults.filter((item) => item.status !== "installed");

    lines.push("## Last Install Attempt", "");
    lines.push(`- installed: ${installedResults.length}`);
    lines.push(`- failed: ${failed.length}`);
    if (failed.length > 0) {
      lines.push("", "### Failed");
      for (const item of failed) lines.push(`- ${item.name}: ${item.ref ?? item.command}`);
      lines.push("");
    }
  }

  if (installedByName.has("__error__")) {
    lines.push("## Detection Error", "", installedByName.get("__error__").path, "");
  }

  return `${lines.join("\n")}\n`;
}

function readJson(target, fallback) {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse(readFileSync(target, "utf8"));
  } catch {
    return fallback;
  }
}
