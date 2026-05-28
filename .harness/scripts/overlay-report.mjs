import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { inferOverlayScopeMatches, loadProjectOverlay, overlayRuleFilesForAgent, resolveImpactScopes } from "./lib/project-overlay.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const text = valueOf("--text=") ?? "";
const agent = valueOf("--agent=") ?? "frontend";
const reportsDir = path.join(root, ".harness", "reports");
const markdownPath = path.join(reportsDir, "overlay-report.md");
const jsonPath = path.join(reportsDir, "overlay-report.json");

const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const impactScopes = resolveImpactScopes(projectProfile, projectOverlay.profile);
const matchedScopeDetails = text ? inferOverlayScopeMatches(projectOverlay.profile, { taskText: text }) : [];
const matchedScopes = matchedScopeDetails.map((item) => item.scope);
const matchedRules = text ? overlayRuleFilesForAgent(projectOverlay, agent, { taskText: text }) : [];

const report = {
  generatedAt: new Date().toISOString(),
  overlay: projectOverlay.path,
  overlayExists: projectOverlay.exists,
  localRuleFile: projectOverlay.localRuleFile,
  discovery: projectOverlay.profile?.discovery ?? null,
  discoveredScopes: projectOverlay.discoveredScopes ?? [],
  impactScopes,
  textProbe: text ? { text, agent, matchedScopes, matchedScopeDetails, matchedRules } : null
};

await mkdir(reportsDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(markdownPath, renderMarkdown(report), "utf8");

console.log(`Overlay report written: ${rel(markdownPath)}`);
console.log(`JSON: ${rel(jsonPath)}`);
if (text) {
  console.log(`Matched scopes: ${matchedScopes.length ? matchedScopes.join(", ") : "(none)"}`);
  console.log(`Matched rules for ${agent}: ${matchedRules.length ? matchedRules.join(", ") : "(none)"}`);
}

function renderMarkdown(data) {
  const lines = [
    "# Project Overlay Report",
    "",
    `- generatedAt: ${data.generatedAt}`,
    `- overlay: ${data.overlay}`,
    `- overlayExists: ${data.overlayExists ? "yes" : "no"}`,
    `- localRuleFile: ${data.localRuleFile}`,
    `- discovery: ${data.discovery?.enabled === false ? "disabled" : "auto"}`,
    "",
    "## Discovered Scopes",
    "",
    "| scope | paths | agents | local rules | includes | keywords |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  const scopes = Object.entries(data.impactScopes ?? {}).sort(([left], [right]) => left.localeCompare(right));
  for (const [scope, impact] of scopes) {
    const overlayScope = data.discoveredScopes.find((item) => item.id === scope)?.config ?? {};
    lines.push([
      `| ${scope}`,
      listCell(impact.write_paths),
      listCell(impact.agents),
      listCell(overlayScope.files),
      listCell(overlayScope.include_scopes),
      listCell((overlayScope.keywords ?? []).slice(0, 10))
    ].join(" | ") + " |");
  }

  lines.push("", "## Manual Impact Scope Overrides", "");
  const manualScopes = Object.keys(data.impactScopes ?? {}).filter((scope) => !(data.discoveredScopes ?? []).some((item) => item.id === scope));
  lines.push(...(manualScopes.length ? manualScopes.map((scope) => `- ${scope}`) : ["- (none)"]));

  if (data.textProbe) {
    lines.push("", "## Text Probe", "");
    lines.push(`- text: ${data.textProbe.text}`);
    lines.push(`- agent: ${data.textProbe.agent}`);
    lines.push(`- matched_scopes: ${data.textProbe.matchedScopes.length ? data.textProbe.matchedScopes.join(", ") : "(none)"}`);
    lines.push("", "### Scope Match Details", "");
    lines.push("| scope | confidence | score | reasons |");
    lines.push("| --- | --- | ---: | --- |");
    if (data.textProbe.matchedScopeDetails.length) {
      for (const item of data.textProbe.matchedScopeDetails) {
        lines.push(`| ${item.scope} | ${item.confidence} | ${item.score} | ${item.reasons.join("<br>")} |`);
      }
    } else {
      lines.push("| - | - | 0 | - |");
    }
    lines.push("", "### Matched Rule Files", "");
    lines.push(...(data.textProbe.matchedRules.length ? data.textProbe.matchedRules.map((item) => `- ${item}`) : ["- (none)"]));
  }

  lines.push("", "## Notes", "");
  lines.push("- App/package scopes are auto-discovered from workspace directories and package.json metadata.");
  lines.push("- Keep project-level AI rules in `.harness/project/`; avoid scattering local rule files by default.");
  lines.push("");
  return lines.join("\n");
}

function listCell(items) {
  const values = (items ?? []).filter(Boolean);
  return values.length ? values.join("<br>") : "-";
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}


