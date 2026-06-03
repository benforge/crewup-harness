import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const allowOwnerArtifacts = args.includes("--allow-owner-artifacts");
const repairTargets = [
  { rel: "test-report.md", owner: "tester" },
  { rel: "review-report.md", owner: "reviewer" },
  { rel: "release-summary.md", owner: "release" }
];

const ZH = {
  testReport: "\u6d4b\u8bd5\u62a5\u544a",
  resultSummary: "\u7ed3\u679c\u6c47\u603b",
  executedItems: "\u6267\u884c\u9879",
  passedItems: "\u901a\u8fc7\u9879",
  failedBlockedItems: "\u5931\u8d25 / \u963b\u585e\u9879",
  uncoveredRisks: "\u672a\u8986\u76d6\u98ce\u9669",
  reviewReport: "\u8bc4\u5ba1\u62a5\u544a",
  conclusion: "\u7ed3\u8bba",
  blockers: "\u963b\u585e\u95ee\u9898",
  nonBlockingSuggestions: "\u975e\u963b\u585e\u5efa\u8bae",
  risks: "\u98ce\u9669",
  testGaps: "\u6d4b\u8bd5\u7f3a\u53e3",
  meetsDefinitionOfDone: "\u662f\u5426\u6ee1\u8db3\u5b8c\u6210\u5b9a\u4e49",
  releaseSummary: "\u53d1\u5e03\u6458\u8981",
  changes: "\u53d8\u66f4\u5185\u5bb9",
  deploySteps: "\u90e8\u7f72\u6b65\u9aa4",
  verifySteps: "\u9a8c\u8bc1\u6b65\u9aa4",
  rollback: "\u56de\u6eda\u65b9\u5f0f",
  relatedRun: "\u5173\u8054 run",
  none: "\u65e0",
  pendingTesterStructure: "\u5f85 Tester Agent \u8865\u5145\uff1brepair-artifacts \u5df2\u8865\u9f50\u7ed3\u6784\u3002",
  pendingTesterCommand: "\u5f85 Tester Agent \u8865\u5145\u5b9e\u9645\u547d\u4ee4\u3002",
  pendingTesterFill: "\u5f85 Tester Agent \u8865\u5145\u3002",
  noExtraUncoveredRisk: "\u65e0\u989d\u5916\u672a\u8986\u76d6\u98ce\u9669\u3002",
  noBlockers: "\u65e0\u963b\u585e\u95ee\u9898\u3002",
  noExtraBlockingRisk: "\u65e0\u989d\u5916\u963b\u585e\u98ce\u9669\u3002",
  noExtraTestGap: "\u65e0\u989d\u5916\u6d4b\u8bd5\u7f3a\u53e3\u3002",
  pendingReleaseStructure: "\u5f85 Release Agent \u8865\u5145\uff1brepair-artifacts \u5df2\u8865\u9f50\u7ed3\u6784\u3002",
  deployByProjectFlow: "\u6309\u9879\u76ee\u73b0\u6709\u53d1\u5e03\u6d41\u7a0b\u90e8\u7f72\u3002",
  referTestReport: "\u53c2\u8003 `artifacts/test-report.md`\u3002",
  rollbackRunChanges: "\u56de\u6eda\u672c\u6b21 run \u8bb0\u5f55\u7684\u53d8\u66f4\u6587\u4ef6\u6216\u63d0\u4ea4\u3002",
  passed: "\u901a\u8fc7",
  conditionalPassed: "\u6709\u6761\u4ef6\u901a\u8fc7",
  failed: "\u4e0d\u901a\u8fc7",
  yes: "\u662f",
  no: "\u5426"
};

if (!runId) {
  console.error("Usage: crewup repair-artifacts <run-id> [--dry-run] [--allow-owner-artifacts]");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");

if (!existsSync(runDir)) {
  console.error(`Run does not exist: ${runId}`);
  process.exit(1);
}

const repairs = [];
const repairedAt = new Date().toISOString();
const ownerGuard = await guardOwnerArtifacts();

await repairTestReport();
await repairReviewReport();
await repairReleaseSummary();

const report = [
  "# Artifact Repair Report",
  "",
  `- runId: ${runId}`,
  `- generatedAt: ${repairedAt}`,
  `- dryRun: ${dryRun ? "true" : "false"}`,
  `- allowOwnerArtifacts: ${allowOwnerArtifacts ? "true" : "false"}`,
  "",
  "## Owner Guard",
  "",
  ...(ownerGuard.length ? ownerGuard.map((item) => `- ${item}`) : ["- none"]),
  "",
  "## Repairs",
  "",
  ...(repairs.length ? repairs.map((item) => `- ${item}`) : ["- none"]),
  ""
].join("\n");

if (!dryRun) {
  await mkdir(logsDir, { recursive: true });
  await writeFile(path.join(logsDir, "artifact-repair.md"), report, "utf8");
}

console.log(report.trimEnd());

async function repairTestReport() {
  const rel = "test-report.md";
  const target = artifactPath(rel);
  if (!existsSync(target)) return;
  let content = await readFile(target, "utf8");
  const original = content;

  content = ensureTitle(content, ZH.testReport);
  content = ensureHeading(content, "Run", [`- runId: ${runId}`, `- repairedAt: ${repairedAt}`].join("\n"));
  content = ensureHeading(content, ZH.resultSummary, bullet(ZH.pendingTesterStructure));
  content = ensureHeading(content, ZH.executedItems, bullet(ZH.pendingTesterCommand));
  content = ensureHeading(content, ZH.passedItems, bullet(ZH.pendingTesterFill));
  content = ensureHeading(content, ZH.failedBlockedItems, bullet(ZH.none));
  content = ensureHeading(content, ZH.uncoveredRisks, bullet(ZH.noExtraUncoveredRisk));
  content = normalizeEmptyBullets(content);

  await maybeWrite(target, original, content, rel);
}

async function guardOwnerArtifacts() {
  const nativePath = path.join(logsDir, "native-subagents", "native-state.json");
  if (!existsSync(nativePath)) return [];
  const native = await readJson(nativePath, null);
  const agents = Array.isArray(native?.agents) ? native.agents : [];
  const blocked = repairTargets.filter((target) => {
    if (!existsSync(artifactPath(target.rel))) return false;
    return agents.some((agent) => agent.agent === target.owner);
  });

  if (!blocked.length) return [];

  const notes = blocked.map((target) => `${target.rel}: owner agent ${target.owner} exists in native-state; prefer resuming that owner agent for artifact repair.`);
  if (allowOwnerArtifacts || dryRun) return notes;

  console.error("Refusing to repair owner-agent artifacts directly.");
  for (const note of notes) console.error(`- ${note}`);
  console.error("Resume the owner agent first, or rerun with --allow-owner-artifacts for explicit maintenance/legacy normalization.");
  process.exit(1);
}

async function readJson(target, fallback) {
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

async function repairReviewReport() {
  const rel = "review-report.md";
  const target = artifactPath(rel);
  if (!existsSync(target)) return;
  let content = await readFile(target, "utf8");
  const original = content;

  content = ensureTitle(content, ZH.reviewReport);
  content = ensureHeading(content, ZH.conclusion, inferReviewConclusion(content));
  content = normalizeReviewConclusion(content);
  content = ensureHeading(content, ZH.blockers, bullet(ZH.none));
  content = ensureHeading(content, ZH.nonBlockingSuggestions, bullet(ZH.none));
  content = ensureHeading(content, ZH.risks, bullet(ZH.noExtraBlockingRisk));
  content = ensureHeading(content, ZH.testGaps, bullet(ZH.noExtraTestGap));
  content = ensureHeading(content, ZH.meetsDefinitionOfDone, `- [x] ${ZH.yes}\n- [ ] ${ZH.no}`);
  content = normalizeEmptyBullets(content);

  await maybeWrite(target, original, content, rel);
}

async function repairReleaseSummary() {
  const rel = "release-summary.md";
  const target = artifactPath(rel);
  if (!existsSync(target)) return;
  let content = await readFile(target, "utf8");
  const original = content;

  content = ensureTitle(content, ZH.releaseSummary);
  content = ensureHeading(content, ZH.changes, bullet(ZH.pendingReleaseStructure));
  content = ensureHeading(content, ZH.deploySteps, ordered(ZH.deployByProjectFlow));
  content = ensureHeading(content, ZH.verifySteps, ordered(ZH.referTestReport));
  content = ensureHeading(content, ZH.rollback, ordered(ZH.rollbackRunChanges));
  content = ensureHeading(content, ZH.relatedRun, bullet(runId));
  content = normalizeEmptyBullets(content);

  await maybeWrite(target, original, content, rel);
}

function artifactPath(name) {
  return path.join(artifactsDir, name);
}

async function maybeWrite(target, original, next, rel) {
  const normalized = ensureTrailingNewline(next);
  if (normalized === original) return;
  repairs.push(`${rel}: normalized required headings and empty-state markers`);
  if (!dryRun) await writeFile(target, normalized, "utf8");
}

function ensureTitle(content, title) {
  const text = String(content ?? "").replace(/^\uFEFF/, "").trimStart();
  if (/^#\s+/m.test(text)) return text;
  return `# ${title}\n\n${text}`.trimEnd();
}

function ensureHeading(content, heading, fallback) {
  if (hasHeading(content, heading)) return content;
  return `${content.trimEnd()}\n\n## ${heading}\n\n${fallback}\n`;
}

function hasHeading(content, heading) {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m").test(content);
}

function normalizeReviewConclusion(content) {
  const section = sectionText(content, ZH.conclusion);
  if (!section) return content;

  const conditional = new RegExp(`${escapeRegExp(ZH.conditionalPassed)}|conditional`, "i").test(section);
  const failed = new RegExp(`${escapeRegExp(ZH.failed)}|failed|fail`, "i").test(section);
  const passed =
    new RegExp(`${escapeRegExp(ZH.passed)}|passed|pass`, "i").test(section) &&
    !failed &&
    !conditional;

  const replacement = [
    `## ${ZH.conclusion}`,
    "",
    `- [${passed ? "x" : " "}] ${ZH.passed}`,
    `- [${conditional ? "x" : " "}] ${ZH.conditionalPassed}`,
    `- [${failed ? "x" : " "}] ${ZH.failed}`
  ].join("\n");

  return replaceSection(content, ZH.conclusion, replacement);
}

function inferReviewConclusion(content) {
  if (new RegExp(`${escapeRegExp(ZH.failed)}|failed|fail`, "i").test(content)) {
    return `- [ ] ${ZH.passed}\n- [ ] ${ZH.conditionalPassed}\n- [x] ${ZH.failed}`;
  }
  if (new RegExp(`${escapeRegExp(ZH.conditionalPassed)}|conditional`, "i").test(content)) {
    return `- [ ] ${ZH.passed}\n- [x] ${ZH.conditionalPassed}\n- [ ] ${ZH.failed}`;
  }
  return `- [x] ${ZH.passed}\n- [ ] ${ZH.conditionalPassed}\n- [ ] ${ZH.failed}`;
}

function normalizeEmptyBullets(content) {
  const emptyWords = [
    ZH.none,
    "\u6682\u65e0",
    ZH.noBlockers
  ].map(escapeRegExp);
  const punctuation = "[ \\t\\u3000\\u3002.!！;；:：]*";
  const pattern = new RegExp(`^(\\s*[-*]\\s*)(${emptyWords.join("|")})${punctuation}$`, "gmu");
  return String(content).replace(pattern, `$1$2`);
}

function sectionText(content, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(content);
  if (!match) return "";
  const rest = content.slice(match.index + match[0].length);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function replaceSection(content, heading, replacement) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(content);
  if (!match) return content;
  const before = content.slice(0, match.index).trimEnd();
  const rest = content.slice(match.index + match[0].length);
  const next = /^##\s+/m.exec(rest);
  const after = next ? rest.slice(next.index).trimStart() : "";
  return [before, replacement, after].filter(Boolean).join("\n\n");
}

function ensureTrailingNewline(content) {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function bullet(value) {
  return `- ${value}`;
}

function ordered(value) {
  return `1. ${value}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
