import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const args = process.argv.slice(2);
const lessonId = args.find((arg) => !arg.startsWith("--"));
const archive = args.includes("--archive");
const restore = args.includes("--restore");

if (!lessonId) {
  console.error("Please provide lesson id, for example: npx crewup learn-promote L-example");
  process.exit(1);
}

const lessonsRoot = path.join(root, ".harness", "knowledge", "lessons");
const candidatesDir = path.join(lessonsRoot, "candidates");
const activeDir = path.join(lessonsRoot, "active");
const archivedDir = path.join(lessonsRoot, "archived");

await mkdir(candidatesDir, { recursive: true });
await mkdir(activeDir, { recursive: true });
await mkdir(archivedDir, { recursive: true });

const fileName = lessonId.endsWith(".md") ? lessonId : `${lessonId}.md`;
const source = archive
  ? firstExisting([path.join(activeDir, fileName), path.join(candidatesDir, fileName)])
  : restore
    ? path.join(archivedDir, fileName)
    : path.join(candidatesDir, fileName);
const targetDir = archive ? archivedDir : activeDir;
const status = archive ? "archived" : "active";

if (!source || !existsSync(source)) {
  console.error(`Lesson not found: ${lessonId}`);
  console.error(`Checked: ${path.relative(root, candidatesDir)}, ${path.relative(root, activeDir)}, ${path.relative(root, archivedDir)}`);
  process.exit(1);
}

const content = await readFile(source, "utf8");
const updated = updateFrontmatterStatus(content, status);
const target = path.join(targetDir, fileName);
await writeFile(target, updated, "utf8");
if (path.resolve(source) !== path.resolve(target)) await rename(source, source.endsWith(".md") ? `${source}.promoted-tmp` : source).catch(() => null);
const temp = `${source}.promoted-tmp`;
if (existsSync(temp)) {
  await import("node:fs/promises").then(({ rm }) => rm(temp, { force: true }));
}

console.log(archive ? `Lesson archived: ${lessonId}` : `Lesson promoted: ${lessonId}`);
console.log(`- status: ${status}`);
console.log(`- path: ${path.relative(root, target).replaceAll("\\", "/")}`);

function firstExisting(paths) {
  return paths.find((item) => existsSync(item)) ?? null;
}

function updateFrontmatterStatus(content, nextStatus) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return content;
  const parsed = parseYaml(match[1]) ?? {};
  parsed.status = nextStatus;
  parsed.promotedAt = nextStatus === "active" ? new Date().toISOString() : parsed.promotedAt ?? null;
  parsed.archivedAt = nextStatus === "archived" ? new Date().toISOString() : parsed.archivedAt ?? null;
  const body = content.slice(match[0].length);
  return `---\n${renderYaml(parsed)}---\n\n${body.replace(/^\r?\n/, "")}`;
}

function renderYaml(value) {
  return Object.entries(value).map(([key, entry]) => {
    if (Array.isArray(entry)) {
      return [`${key}:`, ...entry.map((item) => `  - ${quoteYaml(item)}`)].join("\n");
    }
    if (entry && typeof entry === "object") {
      return [`${key}:`, ...Object.entries(entry).map(([childKey, child]) => `  ${childKey}: ${quoteYaml(child)}`)].join("\n");
    }
    if (entry === null || entry === undefined) return `${key}: null`;
    return `${key}: ${quoteYaml(entry)}`;
  }).join("\n") + "\n";
}

function quoteYaml(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value ?? ""));
}
