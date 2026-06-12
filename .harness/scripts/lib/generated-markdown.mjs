import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export async function loadGeneratedMarkdownSchema(root) {
  const target = path.join(root, ".harness", "config", "generated-markdown-schema.yaml");
  if (!existsSync(target)) return {};
  return parseYaml(await readFile(target, "utf8"))?.files ?? {};
}

export function renderGeneratedMarkdown({ title, file, sections, schema }) {
  const rules = schema?.[file];
  const headings = rules?.required_headings ?? Object.keys(sections ?? {});
  const missing = headings.filter((heading) => !Object.prototype.hasOwnProperty.call(sections ?? {}, heading));
  if (missing.length > 0) {
    throw new Error(`Generated Markdown ${file} missing sections: ${missing.join(", ")}`);
  }

  const lines = [`# ${title}`, ""];
  for (const heading of headings) {
    lines.push(`## ${heading}`, "");
    lines.push(...renderSection(sections[heading]));
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function validateGeneratedMarkdownContent({ file, content, schema }) {
  const rules = schema?.[file];
  if (!rules?.required_headings?.length) return [];
  const problems = [];
  for (const heading of rules.required_headings) {
    if (!hasMarkdownHeading(content, heading)) problems.push(`${file} missing heading: ${heading}`);
  }
  return problems;
}

export async function validateGeneratedMarkdownFile({ root, runId, file, schema }) {
  const target = path.join(root, ".harness", "runs", runId, file);
  if (!existsSync(target)) return [`${file} is missing`];
  const content = await readFile(target, "utf8");
  return validateGeneratedMarkdownContent({ file, content, schema });
}

function renderSection(value) {
  if (Array.isArray(value)) return value.flatMap((item) => renderSectionItem(item));
  return renderSectionItem(value);
}

function renderSectionItem(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : ["- none"];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (value && typeof value === "object") {
    if (value.markdown && typeof value.markdown === "string") return [value.markdown.trim() || "- none"];
    if (Array.isArray(value.items)) return value.items.map((item) => `- ${String(item).trim() || "none"}`);
    if (Array.isArray(value.rows)) return renderTable(value);
    return ["```json", JSON.stringify(value, null, 2), "```"];
  }
  return ["- none"];
}

function renderTable(value) {
  const headers = value.headers ?? [];
  const rows = value.rows ?? [];
  if (!headers.length) return ["```json", JSON.stringify(rows, null, 2), "```"];
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? "")).join(" | ")} |`)
  ];
}

function hasMarkdownHeading(content, heading) {
  const escaped = escapeRegExp(String(heading).trim());
  return new RegExp(`^#{2,6}\\s+${escaped}\\s*$`, "im").test(content);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
