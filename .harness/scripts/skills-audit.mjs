import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const skillsDir = path.join(root, ".agents", "skills");
const outPath = path.join(root, ".harness", "reports", "skills-audit.md");
const lockPath = path.join(root, "skills-lock.json");
const lock = existsSync(lockPath) ? JSON.parse(await readFile(lockPath, "utf8")) : { skills: {} };

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, await renderAudit(), "utf8");

console.log(`Skill audit written: ${path.relative(root, outPath)}`);

async function renderAudit() {
  const lines = [
    "# Skill Audit",
    "",
    "This audit checks project-installed skills under `.agents/skills/` against `skills-lock.json` and SKILL.md frontmatter.",
    "",
    "## Installed Skills",
    ""
  ];

  const entries = existsSync(skillsDir)
    ? (await readdir(skillsDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    : [];

  if (entries.length === 0) {
    lines.push("- None.");
  }

  for (const name of entries) {
    const skillFile = path.join(skillsDir, name, "SKILL.md");
    const lockEntry = lock.skills?.[name];
    const frontmatter = existsSync(skillFile) ? parseFrontmatter(await readFile(skillFile, "utf8")) : null;

    lines.push(`### ${name}`);
    lines.push(`- skill file: ${existsSync(skillFile) ? "present" : "missing"}`);
    lines.push(`- lock entry: ${lockEntry ? "present" : "missing"}`);
    if (lockEntry) {
      lines.push(`- source: ${lockEntry.sourceType ?? "unknown"}:${lockEntry.source ?? "unknown"}`);
      if (lockEntry.skillPath) lines.push(`- skill path: ${lockEntry.skillPath}`);
    }
    lines.push(`- frontmatter name: ${frontmatter?.name ?? "missing"}`);
    lines.push(`- description: ${frontmatter?.description ? "present" : "missing"}`);
    const warnings = [];
    if (!existsSync(skillFile)) warnings.push("missing SKILL.md");
    if (!lockEntry) warnings.push("not recorded in skills-lock.json");
    if (!frontmatter?.name) warnings.push("missing frontmatter name");
    if (!frontmatter?.description) warnings.push("missing frontmatter description");
    lines.push(`- audit: ${warnings.length ? warnings.join("; ") : "ok"}`);
    lines.push("");
  }

  const lockOnly = Object.keys(lock.skills ?? {}).filter((name) => !entries.includes(name)).sort();
  if (lockOnly.length > 0) {
    lines.push("## Lock Entries Missing From Project", "");
    for (const name of lockOnly) lines.push(`- ${name}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function parseFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  try {
    return parseYaml(content.slice(3, end).trim());
  } catch {
    return null;
  }
}
