import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export async function renderOwnedArtifactPayloads({ root, runId, agentId, parsedJson, artifactSchema }) {
  const rendered = [];
  for (const file of ownedUpdatedArtifactFiles({ agentId, parsedJson, artifactSchema })) {
    const payload = findArtifactPayload(parsedJson?.artifactPayloads, file);
    if (!payload) {
      throw new Error(`Missing structured artifactPayloads entry for artifacts/${file}`);
    }
    const markdown = renderMarkdownArtifact({ file, payload, schema: artifactSchema[file] });
    const target = path.join(root, ".harness", "runs", runId, "artifacts", file);
    await writeFile(target, markdown, "utf8");
    rendered.push(file);
  }
  return rendered;
}

export async function validateOwnedArtifactHeadings({ root, runId, agentId, parsedJson, artifactSchema }) {
  const problems = [];
  for (const file of ownedUpdatedArtifactFiles({ agentId, parsedJson, artifactSchema })) {
    const rules = artifactSchema[file];
    const target = path.join(root, ".harness", "runs", runId, "artifacts", file);
    if (!existsSync(target)) {
      problems.push(`Missing owned artifact: ${file}`);
      continue;
    }
    const content = await readFile(target, "utf8");
    for (const heading of rules.required_headings ?? []) {
      if (!hasMarkdownHeading(content, heading)) problems.push(`Owned artifact missing heading: ${file} -> ${heading}`);
    }
  }
  return problems;
}

export function ownedUpdatedArtifactFiles({ agentId, parsedJson, artifactSchema }) {
  const files = new Set();
  for (const item of [
    ...asArray(parsedJson?.artifactsUpdated),
    ...asArray(parsedJson?.artifactUpdates)
  ]) {
    const artifactPath = typeof item === "string" ? item : item?.path;
    const file = normalizeArtifactFileName(artifactPath);
    if (file && artifactSchema[file]?.owner === agentId) files.add(file);
  }
  return [...files];
}

function findArtifactPayload(payloads, file) {
  if (!payloads || typeof payloads !== "object") return null;
  return payloads[`artifacts/${file}`] ?? payloads[file] ?? null;
}

function renderMarkdownArtifact({ file, payload, schema }) {
  const sections = payload?.sections;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    throw new Error(`artifactPayloads for artifacts/${file} must contain a sections object`);
  }

  const missing = [];
  for (const heading of schema.required_headings ?? []) {
    if (!hasOwn(sections, heading) || isEmptySection(sections[heading])) missing.push(heading);
  }
  if (missing.length > 0) {
    throw new Error(`artifactPayloads for artifacts/${file} missing required sections: ${missing.join(", ")}`);
  }

  const lines = [`# ${payload.title || artifactTitle(file)}`, ""];
  for (const heading of schema.required_headings ?? []) {
    lines.push(`## ${heading}`, "");
    lines.push(...renderSection(sections[heading]));
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function renderSection(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => renderSectionItem(item));
  }
  return renderSectionItem(value);
}

function renderSectionItem(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : ["- none"];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (value && typeof value === "object") {
    if (value.markdown && typeof value.markdown === "string") return [value.markdown.trim() || "- none"];
    if (value.items && Array.isArray(value.items)) return value.items.map((item) => `- ${String(item).trim() || "none"}`);
    return ["```json", JSON.stringify(value, null, 2), "```"];
  }
  return ["- none"];
}

function isEmptySection(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptySection);
  return false;
}

function normalizeArtifactFileName(target) {
  const normalized = String(target ?? "").replaceAll("\\", "/");
  const marker = "artifacts/";
  const index = normalized.lastIndexOf(marker);
  const file = index >= 0 ? normalized.slice(index + marker.length) : path.posix.basename(normalized);
  return file && file.endsWith(".md") ? file : "";
}

function hasMarkdownHeading(content, heading) {
  const escaped = escapeRegExp(String(heading).trim());
  return new RegExp(`^#{2,6}\\s+${escaped}\\s*$`, "im").test(content);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function artifactTitle(fileName) {
  return fileName
    .replace(/\.md$/, "")
    .split("-")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}
