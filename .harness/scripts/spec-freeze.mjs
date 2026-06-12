import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { analyzeWorkload } from "./lib/workload-analysis.mjs";
import { loadGeneratedMarkdownSchema, renderGeneratedMarkdown } from "./lib/generated-markdown.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:spec-freeze -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");

if (!existsSync(inputPath)) {
  console.error(`Missing run input: ${path.relative(root, inputPath)}`);
  process.exit(1);
}

await mkdir(artifactsDir, { recursive: true });
await mkdir(logsDir, { recursive: true });

const generatedMarkdownSchema = await loadGeneratedMarkdownSchema(root);
const input = await readFile(inputPath, "utf8");
const existingRequirement = await readOptional(path.join(artifactsDir, "requirement.md"));
const analysis = analyzeWorkload(input);
const frozen = freezeSpec(input, existingRequirement, analysis);
const completionContract = buildCompletionContract(frozen);

await writeFile(path.join(runDir, "GOAL.md"), renderGoal(frozen, completionContract), "utf8");
await writeFile(path.join(runDir, "completion-contract.json"), `${JSON.stringify(completionContract, null, 2)}\n`, "utf8");
await writeFile(path.join(artifactsDir, "spec-freeze.md"), renderSpecFreeze(frozen), "utf8");
await writeFile(path.join(logsDir, "spec-freeze.json"), `${JSON.stringify(frozen, null, 2)}\n`, "utf8");

console.log(`Spec freeze written: ${path.relative(root, path.join(artifactsDir, "spec-freeze.md")).replaceAll("\\", "/")}`);
console.log(`Completion contract written: ${path.relative(root, path.join(runDir, "GOAL.md")).replaceAll("\\", "/")}`);
console.log(`- profile: ${frozen.workflowProfile}`);
console.log(`- stability: ${frozen.stability}`);
console.log(`- open_questions: ${frozen.openQuestions.length}`);

function freezeSpec(inputText, requirementText, workload) {
  const source = chooseSource(inputText, requirementText);
  const bullets = extractBullets(source);
  const sentences = extractSentences(source);
  const candidates = [...bullets, ...sentences];
  const goals = pickByPatterns(candidates, [
    /目标|实现|新增|修复|优化|完成|支持|需要|希望|build|implement|fix|add|support/i
  ], 5);
  const nonGoals = pickByPatterns(candidates, [
    /不需要|不要|不做|无需|不包含|不能|避免|do not|without|exclude/i
  ], 5);
  const acceptance = pickByPatterns(candidates, [
    /验收|通过|成功|测试|验证|期望|应该|必须|acceptance|test|verify|should|must/i
  ], 6);
  const constraints = pickByPatterns(candidates, [
    /限制|约束|兼容|性能|安全|权限|部署|环境|token|成本|稳定|constraint|compat|security|performance/i
  ], 6);
  const openQuestions = inferOpenQuestions(source, workload);
  const stability = openQuestions.length > 0 || workload.signals?.ambiguous ? "needs_review" : "stable_enough";

  return {
    runId,
    generatedAt: new Date().toISOString(),
    workflowProfile: workload.workflowProfile,
    complexityScore: workload.complexityScore,
    complexityLevel: workload.complexityLevel,
    stability,
    summary: oneLine(source) || "Complete the user request captured in input.md.",
    goals: uniqueList(goals.length ? goals : [oneLine(source) || "Complete the user request captured in input.md."]),
    nonGoals: uniqueList(nonGoals),
    acceptanceCriteria: uniqueList(acceptance),
    constraints: uniqueList(constraints),
    openQuestions: uniqueList(openQuestions),
    contextRules: [
      "Read artifacts/spec-freeze.md before reading the full input when context is constrained.",
      "If spec-freeze conflicts with input.md, input.md is authoritative and the conflict must be reported.",
      "If context is insufficient for a high-risk decision, return needs_input instead of guessing."
    ]
  };
}

function chooseSource(inputText, requirementText) {
  if (isMeaningfulRequirementDraft(requirementText)) return stripMarkdownNoise(requirementText);
  return stripMarkdownNoise(inputText);
}

function buildCompletionContract(spec) {
  return {
    runId: spec.runId,
    generatedAt: spec.generatedAt,
    workflowProfile: spec.workflowProfile,
    verdicts: {
      success: [
        "state.status is done",
        "state.outcome is success",
        "state.archived is true",
        "required owner artifacts exist and pass gates",
        "tester/reviewer/release evidence is recorded when required",
        "run-report and archive summary exist"
      ],
      partial: [
        "some deliverables are reusable but strict owner-agent workflow did not fully complete",
        "direct-chat or manual work occurred outside the formal CrewUp loop",
        "non-critical verification/release evidence is missing"
      ],
      blocked: [
        "required tool, service, environment, dependency, or owner-agent path is unavailable",
        "repair loop exceeded the configured maximum"
      ],
      failed: [
        "required verification failed and the result should not be treated as delivered"
      ]
    },
    successCriteria: uniqueList([
      ...spec.acceptanceCriteria,
      "All required CrewUp gates pass.",
      "The run is archived with outcome=success."
    ]),
    nonGoals: spec.nonGoals,
    constraints: spec.constraints,
    maxRepairRounds: spec.workflowProfile === "full" ? 3 : 2,
    requiredEvidence: [
      "RUN_STATUS.md",
      "RUN_SUMMARY.md after archive",
      "logs/run-report.md",
      "logs/archive/archive-summary.md",
      "owner artifacts required by the current workflow profile"
    ]
  };
}

function renderGoal(spec, contract) {
  return renderGeneratedMarkdown({
    title: `Iteration Goal: ${spec.runId}`,
    file: "GOAL.md",
    schema: {
      "GOAL.md": {
        required_headings: ["Verdict Rule", "Goal", "Success Criteria", "Non-Goals", "Constraints", "Repair Budget", "Required Evidence"]
      }
    },
    sections: {
      "Verdict Rule": [
        "Only `SUCCESS` means this CrewUp iteration is fully complete.",
        "`PARTIAL`, `BLOCKED`, `FAILED`, `CANCELED`, `IN_PROGRESS`, and `WAITING_USER` are not successful completion."
      ],
      Goal: listSection(spec.goals, "Complete the user request captured in input.md."),
      "Success Criteria": listSection(contract.successCriteria, "All required CrewUp gates pass and the run archives with outcome=success."),
      "Non-Goals": listSection(contract.nonGoals, "No explicit non-goals captured."),
      Constraints: listSection(contract.constraints, "No explicit constraints captured."),
      "Repair Budget": [
        `- maxRepairRounds: ${contract.maxRepairRounds}`,
        "- If repair rounds exceed this budget, archive as BLOCKED or PARTIAL instead of continuing indefinitely."
      ],
      "Required Evidence": contract.requiredEvidence.map((item) => `- ${item}`)
    }
  });
}

function renderSpecFreeze(spec) {
  return renderGeneratedMarkdown({
    title: `Spec Freeze: ${spec.runId}`,
    file: "artifacts/spec-freeze.md",
    schema: generatedMarkdownSchema,
    sections: {
      Summary: [
        `- generatedAt: ${spec.generatedAt}`,
        `- workflowProfile: ${spec.workflowProfile}`,
        `- complexity: ${spec.complexityScore}/5 (${spec.complexityLevel})`,
        `- stability: ${spec.stability}`,
        `- request: ${spec.summary}`
      ],
      Goals: listSection(spec.goals, "Complete the user request captured in input.md."),
      "Non-Goals": listSection(spec.nonGoals, "No explicit non-goals captured."),
      "Acceptance Criteria": listSection(spec.acceptanceCriteria, "No explicit acceptance criteria captured; downstream agents must record validation evidence."),
      Constraints: listSection(spec.constraints, "No explicit constraints captured."),
      "Open Questions": listSection(spec.openQuestions, "none"),
      "Context Rules": spec.contextRules.map((item) => `- ${item}`),
      Metadata: [
        `- runId: ${spec.runId}`,
        `- generatedAt: ${spec.generatedAt}`,
        `- profile: ${spec.workflowProfile}`
      ]
    }
  });
}

function extractBullets(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => Boolean(line) && !isTemplateNoise(line));
}

function extractSentences(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .split(/[\n。！？；?;]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4 && !isTemplateNoise(item))
    .slice(0, 40);
}

function pickByPatterns(items, patterns, limit) {
  const seen = new Set();
  const picked = [];
  for (const item of items) {
    if (!patterns.some((pattern) => pattern.test(item))) continue;
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    picked.push(limitText(normalized, 180));
    if (picked.length >= limit) break;
  }
  return picked;
}

function inferOpenQuestions(text, workload) {
  const questions = [];
  if (workload.signals?.ambiguous) questions.push("The request has exploration or ambiguity signals; confirm target behavior and acceptance criteria before high-risk implementation.");
  if (workload.signals?.highRisk) questions.push("The request has high-risk signals; confirm data, permission, release, or rollback boundaries.");
  if (!/(验收|测试|验证|acceptance|test|verify)/i.test(text)) questions.push("No explicit validation standard was detected; define how completion should be verified.");
  return questions;
}

function stripMarkdownNoise(text) {
  return String(text ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+/gm, "")
    .trim();
}

function oneLine(value) {
  return String(value ?? "").trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] ?? "";
}

function listSection(items, fallback) {
  return uniqueList(items?.length ? items : [fallback]).map((item) => `- ${item}`);
}

function limitText(text, maxChars) {
  return String(text ?? "").length > maxChars ? `${String(text).slice(0, maxChars).trim()}...` : String(text ?? "");
}

function uniqueList(items) {
  const values = [...new Set((items ?? []).map((item) => String(item).trim()).filter(Boolean))];
  return values.filter((item) => !values.some((other) =>
    other !== item &&
    other.length > item.length + 3 &&
    other.startsWith(item)
  ));
}

function isMeaningfulRequirementDraft(text) {
  const value = String(text ?? "").trim();
  if (!value) return false;
  if (isTemplateNoise(value)) return false;
  return /(目标|验收|约束|不要|不需要|需求|实现|优化|修复|说明|README|文档|使用)/i.test(value);
}

function isTemplateNoise(text) {
  return /pending|Write this section content here|AC-01: pending|No business code changes were made/i.test(String(text ?? ""));
}

async function readOptional(target) {
  if (!existsSync(target)) return "";
  return readFile(target, "utf8");
}
