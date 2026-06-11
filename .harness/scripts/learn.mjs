import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const writeCandidates = !args.includes("--no-write-candidates");
const writeGlobal = !args.includes("--no-global-write");
const minConfidence = Number(valueOf("--min-confidence=") ?? 0.55);

if (!runId) {
  console.error("Please provide runId, for example: npx crewup learn <run-id>");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
if (!existsSync(runDir)) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const learningDir = path.join(runDir, "logs", "learning");
const lessonsRoot = path.join(root, ".harness", "knowledge", "lessons");
const candidatesDir = path.join(lessonsRoot, "candidates");
const activeDir = path.join(lessonsRoot, "active");
const archivedDir = path.join(lessonsRoot, "archived");

const evidence = await loadEvidence(runId);
const candidates = buildCandidates(evidence)
  .filter((candidate) => candidate.confidence >= minConfidence)
  .sort((left, right) => right.confidence - left.confidence || left.id.localeCompare(right.id));

const result = {
  runId,
  generatedAt: new Date().toISOString(),
  minConfidence,
  count: candidates.length,
  candidates
};

if (dryRun) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

await mkdir(learningDir, { recursive: true });
await writeFile(path.join(learningDir, "lesson-candidates.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(path.join(learningDir, "lesson-candidates.md"), renderCandidateReport(result), "utf8");

if (writeCandidates && writeGlobal) {
  await mkdir(candidatesDir, { recursive: true });
  await mkdir(activeDir, { recursive: true });
  await mkdir(archivedDir, { recursive: true });
  await Promise.all([
    ensureGitkeep(candidatesDir),
    ensureGitkeep(activeDir),
    ensureGitkeep(archivedDir)
  ]);
  for (const candidate of candidates) {
    const target = path.join(candidatesDir, `${candidate.id}.md`);
    if (existsSync(target)) continue;
    await writeFile(target, renderLessonMarkdown(candidate), "utf8");
  }
}

console.log(`Memory lessons analyzed: ${runId}`);
console.log(`- candidates: ${candidates.length}`);
console.log(`- report: .harness/runs/${runId}/logs/learning/lesson-candidates.md`);
if (writeCandidates && writeGlobal) console.log("- knowledge: .harness/knowledge/lessons/candidates/");

async function loadEvidence(currentRunId) {
  const artifactsDir = path.join(runDir, "artifacts");
  const logsDir = path.join(runDir, "logs");
  return {
    runId: currentRunId,
    state: await readJson(path.join(runDir, "state.json"), {}),
    input: await readOptional(path.join(runDir, "input.md")),
    requirement: await readOptional(path.join(artifactsDir, "requirement.md")),
    architecture: await readOptional(path.join(artifactsDir, "architecture.md")),
    implementationPlan: await readOptional(path.join(artifactsDir, "implementation-plan.md")),
    testReport: await readOptional(path.join(artifactsDir, "test-report.md")),
    reviewReport: await readOptional(path.join(artifactsDir, "review-report.md")),
    releaseSummary: await readOptional(path.join(artifactsDir, "release-summary.md")),
    runReport: await readOptional(path.join(logsDir, "run-report.md")),
    changedFiles: await readJson(path.join(logsDir, "changed-files.json"), { files: [] }),
    repairLoop: await readJson(path.join(logsDir, "repair-loop.json"), null),
    nativeState: await readJson(path.join(logsDir, "native-subagents", "native-state.json"), null),
    toolFallbacks: await readToolFallbacks(logsDir)
  };
}

function buildCandidates(data) {
  const items = [];
  const scopes = inferScopes(data);
  const outcome = data.state?.outcome ?? "none";
  const status = data.state?.status ?? "unknown";
  const reason = data.state?.reason ?? data.state?.health?.reason ?? "";

  if (["blocked", "partial", "failed"].includes(outcome) || ["blocked", "partial", "failed"].includes(status)) {
    items.push(candidate({
      key: "non-success-closeout",
      domain: "workflow",
      confidence: outcome === "blocked" || status === "blocked" ? 0.72 : 0.62,
      scopes,
      trigger: "a run reaches blocked, partial, or failed outcome",
      action: "summarize the blocker before the next related run and check whether a continuation run is needed",
      lesson: "Non-success CrewUp runs should leave a short reusable blocker summary so related future runs do not treat partial work as delivered.",
      applyWhen: ["A related run has the same scope or module.", "The previous run outcome is blocked, partial, or failed."],
      doNotApplyWhen: ["The previous run reached success and was archived."],
      evidence: compactPaths([
        ".harness/runs/<run>/state.json",
        reason ? ".harness/runs/<run>/RUN_STATUS.md" : null,
        ".harness/runs/<run>/logs/run-report.md"
      ]),
      summary: reason ? limitText(reason, 180) : `${status}/${outcome}`
    }));
  }

  if (hasReviewerBlockingSignal(data.reviewReport) || resultJsonFixRequired(data.nativeState, "reviewer")) {
    items.push(candidate({
      key: "reviewer-blocking-repair",
      domain: "review",
      confidence: 0.74,
      scopes,
      trigger: "reviewer reports blocking issues or fixRequired=true",
      action: "route fixes to the owning targetAgents before rerunning review",
      lesson: "Reviewer blocking feedback is repair input for owner agents; the main agent should preserve the feedback trail and avoid direct business-code fixes.",
      applyWhen: ["Reviewer result has blocking issues.", "Reviewer result JSON has fixRequired=true."],
      doNotApplyWhen: ["Reviewer only records non-blocking suggestions."],
      evidence: compactPaths([
        ".harness/runs/<run>/artifacts/review-report.md",
        ".harness/runs/<run>/logs/native-subagents/reviewer.result.json"
      ]),
      summary: firstMeaningfulLine(data.reviewReport, "reviewer blocking issue detected")
    }));
  }

  if (hasTesterFailureSignal(data.testReport) || resultJsonFixRequired(data.nativeState, "tester")) {
    items.push(candidate({
      key: "tester-failure-repair",
      domain: "testing",
      confidence: 0.7,
      scopes,
      trigger: "tester reports failed checks or fixRequired=true",
      action: "send precise requiredFixes to the owning implementation agent before claiming completion",
      lesson: "Tester failures should become targeted owner-agent repair tasks, with the failing command or acceptance criterion preserved in the handoff.",
      applyWhen: ["Tester result has failed checks.", "Tester result JSON has fixRequired=true."],
      doNotApplyWhen: ["Tester skipped checks with an explicit accepted reason."],
      evidence: compactPaths([
        ".harness/runs/<run>/artifacts/test-report.md",
        ".harness/runs/<run>/logs/native-subagents/tester.result.json"
      ]),
      summary: firstMeaningfulLine(data.testReport, "tester failure detected")
    }));
  }

  const repairRounds = repairRoundCount(data.repairLoop, data.nativeState);
  if (repairRounds >= 2) {
    items.push(candidate({
      key: "repeated-repair-loop",
      domain: "workflow",
      confidence: Math.min(0.82, 0.58 + repairRounds * 0.06),
      scopes,
      trigger: "a run enters two or more repair rounds",
      action: "summarize the repeated failure pattern before dispatching the next repair",
      lesson: "Multiple repair rounds are a signal to narrow the next handoff and include the exact failed gate, owner, and expected evidence.",
      applyWhen: ["repair-loop.json records two or more repair rounds.", "Reviewer/tester keeps returning the same class of issue."],
      doNotApplyWhen: ["The next task is unrelated to the repaired scope."],
      evidence: compactPaths([".harness/runs/<run>/logs/repair-loop.json", ".harness/runs/<run>/logs/run-report.md"]),
      summary: `${repairRounds} repair rounds detected`
    }));
  }

  const highRiskFiles = highRiskChangedFiles(data.changedFiles?.files ?? []);
  if (highRiskFiles.length > 0) {
    items.push(candidate({
      key: "high-risk-change",
      domain: "risk",
      confidence: 0.68,
      scopes: [...new Set([...scopes, ...scopesForFiles(highRiskFiles)])],
      trigger: "a related run touches high-risk paths or content areas",
      action: "require explicit risk review and preserve rollback evidence",
      lesson: "Runs that touch migrations, SQL, CI/CD, infra, or environment-sensitive files should surface risk and rollback requirements before implementation.",
      applyWhen: ["The current request mentions database, migration, deployment, CI/CD, or env changes.", "Related historical run touched high-risk files."],
      doNotApplyWhen: ["The run is docs-only and does not change runtime behavior."],
      evidence: compactPaths([".harness/runs/<run>/logs/changed-files.json"]),
      summary: highRiskFiles.slice(0, 4).join(", ")
    }));
  }

  const fallbackReasons = fallbackSignals(data);
  if (fallbackReasons.length > 0) {
    items.push(candidate({
      key: "tooling-fallback",
      domain: "tooling",
      confidence: 0.64,
      scopes,
      trigger: "native agent, MCP, plugin, or optional tool fallback is recorded",
      action: "check tool availability early and record fallback before relying on that capability",
      lesson: "Tool fallback evidence should be carried into related future runs so unavailable integrations are not assumed during planning.",
      applyWhen: ["A related run recorded native fallback or tool-fallback evidence.", "The new task needs the same optional integration."],
      doNotApplyWhen: ["The current environment has verified the tool is available."],
      evidence: compactPaths([
        ".harness/runs/<run>/logs/native-subagents/native-state.json",
        ".harness/runs/<run>/logs/tool-fallbacks/"
      ]),
      summary: fallbackReasons.slice(0, 3).join("; ")
    }));
  }

  return dedupeCandidates(items);
}

function candidate(data) {
  const id = `L-${slug(runId)}-${data.key}`;
  return {
    id,
    sourceRun: runId,
    status: "candidate",
    domain: data.domain,
    confidence: Number(data.confidence.toFixed(2)),
    scope: data.scopes?.length ? data.scopes : ["general"],
    trigger: data.trigger,
    action: data.action,
    summary: data.summary ?? data.lesson,
    lesson: data.lesson,
    applyWhen: data.applyWhen ?? [],
    doNotApplyWhen: data.doNotApplyWhen ?? [],
    evidence: data.evidence.map((item) => item.replace("<run>", runId)),
    generatedAt: new Date().toISOString()
  };
}

function dedupeCandidates(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = `${item.domain}:${item.trigger}:${item.action}`;
    const current = byKey.get(key);
    if (!current || item.confidence > current.confidence) byKey.set(key, item);
  }
  return [...byKey.values()];
}

function renderCandidateReport(data) {
  const lines = [
    `# Lesson Candidates: ${data.runId}`,
    "",
    "> Generated by `crewup learn`. Candidates are not active rules until promoted.",
    "",
    `- generatedAt: ${data.generatedAt}`,
    `- minConfidence: ${data.minConfidence}`,
    `- candidates: ${data.count}`,
    "",
    "## Candidates",
    ""
  ];

  if (data.candidates.length === 0) {
    lines.push("- none", "");
    return `${lines.join("\n")}\n`;
  }

  for (const item of data.candidates) {
    lines.push(
      `### ${item.id}`,
      "",
      `- status: ${item.status}`,
      `- domain: ${item.domain}`,
      `- confidence: ${item.confidence}`,
      `- scope: ${item.scope.join(", ")}`,
      `- trigger: ${item.trigger}`,
      `- action: ${item.action}`,
      `- summary: ${item.summary}`,
      `- path: .harness/knowledge/lessons/candidates/${item.id}.md`,
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderLessonMarkdown(item) {
  const frontmatter = {
    id: item.id,
    sourceRun: item.sourceRun,
    status: item.status,
    domain: item.domain,
    confidence: item.confidence,
    scope: item.scope,
    trigger: item.trigger,
    action: item.action,
    evidence: item.evidence,
    generatedAt: item.generatedAt
  };
  return [
    "---",
    yaml(frontmatter),
    "---",
    "",
    "# Lesson",
    "",
    item.lesson,
    "",
    "## Summary",
    "",
    `- ${item.summary}`,
    "",
    "## Apply When",
    "",
    ...(item.applyWhen.length ? item.applyWhen.map((entry) => `- ${entry}`) : ["- related scope and trigger match"]),
    "",
    "## Do Not Apply When",
    "",
    ...(item.doNotApplyWhen.length ? item.doNotApplyWhen.map((entry) => `- ${entry}`) : ["- the current run is unrelated"]),
    "",
    "## Evidence",
    "",
    ...item.evidence.map((entry) => `- \`${entry}\``),
    ""
  ].join("\n");
}

async function readOptional(target) {
  return await readFile(target, "utf8").catch(() => "");
}

async function readJson(target, fallback) {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

async function readToolFallbacks(logsDir) {
  const dir = path.join(logsDir, "tool-fallbacks");
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries.filter((item) => item.isFile())) {
    files.push(await readOptional(path.join(dir, entry.name)));
  }
  return files;
}

async function ensureGitkeep(dir) {
  const target = path.join(dir, ".gitkeep");
  if (!existsSync(target)) await writeFile(target, "", "utf8");
}

function inferScopes(data) {
  const text = [
    data.input,
    data.requirement,
    data.architecture,
    data.implementationPlan,
    data.reviewReport,
    data.testReport,
    ...(data.changedFiles?.files ?? [])
  ].join("\n");
  const scopes = new Set(scopesForText(text));
  for (const file of data.changedFiles?.files ?? []) {
    for (const scope of scopesForFile(file)) scopes.add(scope);
  }
  return [...scopes].sort();
}

function scopesForText(text) {
  const raw = String(text ?? "");
  const patterns = {
    frontend: /frontend|web|ui|页面|组件|样式|前端|apps\/web|src\/components/i,
    backend: /backend|api|server|service|controller|接口|后端|apps\/api/i,
    database: /database|db|migration|schema|sql|prisma|数据库|迁移/i,
    devops: /devops|infra|deploy|docker|ci\/cd|workflow|部署|流水线|\.github/i,
    docs: /docs|readme|文档|\.md\b/i,
    testing: /test|vitest|jest|playwright|测试|验收/i,
    review: /reviewer|review-report|blocking issues|评审|审查/i
  };
  return Object.entries(patterns).filter(([, pattern]) => pattern.test(raw)).map(([scope]) => scope);
}

function scopesForFiles(files) {
  return [...new Set(files.flatMap(scopesForFile))].sort();
}

function scopesForFile(file) {
  const value = String(file ?? "").replaceAll("\\", "/").toLowerCase();
  const scopes = [];
  if (/(\.tsx?$|\.jsx?$|src\/|components\/|pages\/|app\/|public\/|vite|index\.html)/.test(value)) scopes.push("frontend");
  if (/(server\/|api\/|controller|service|route|\.py$|\.go$|\.rs$)/.test(value)) scopes.push("backend");
  if (/(migration|migrations\/|schema|prisma\/|db\/|\.sql$)/.test(value)) scopes.push("database");
  if (/(\.github\/|infra\/|docker|compose|deploy|ci)/.test(value)) scopes.push("devops");
  if (/(\.md$|docs\/|readme)/.test(value)) scopes.push("docs");
  return scopes;
}

function highRiskChangedFiles(files) {
  return files.filter((file) => {
    const value = String(file ?? "").replaceAll("\\", "/").toLowerCase();
    return /(^|\/)(migrations?|infra|\.github\/workflows)\//.test(value)
      || /\.(sql)$/.test(value)
      || /(^|\/)(dockerfile|docker-compose|compose\.ya?ml)$/.test(value)
      || /(^|\/)\.env(\.|$)/.test(value);
  });
}

function hasReviewerBlockingSignal(content) {
  const text = String(content ?? "");
  if (!text.trim()) return false;
  return /fixRequired\s*[:|]\s*true/i.test(text)
    || /blocking issues/i.test(text) && !/blocking issues[\s\S]{0,120}-\s*none/i.test(text)
    || /\[\s*x\s*\]\s*fail/i.test(text)
    || /阻塞|必须修复|blocking/i.test(text);
}

function hasTesterFailureSignal(content) {
  const text = String(content ?? "");
  if (!text.trim()) return false;
  return /fixRequired\s*[:|]\s*true/i.test(text)
    || /\bfailed?\b|失败|未通过/i.test(text)
    || /\|\s*(fail|failed)\s*\|/i.test(text);
}

function resultJsonFixRequired(nativeState, agentName) {
  const agent = (nativeState?.agents ?? []).find((item) => item.agent === agentName);
  return Boolean(agent?.fixRequired || agent?.blockingIssues?.length || agent?.requiredFixes?.length);
}

function repairRoundCount(repairLoop, nativeState) {
  if (Array.isArray(repairLoop?.rounds)) return repairLoop.rounds.length;
  if (Array.isArray(repairLoop)) return repairLoop.length;
  const repairResults = (nativeState?.agents ?? []).filter((agent) => agent.repairOf || agent.repairReason || /repair/i.test(agent.result_path ?? ""));
  return repairResults.length;
}

function fallbackSignals(data) {
  const reasons = [];
  if (data.nativeState?.fallback?.reason) reasons.push(data.nativeState.fallback.reason);
  for (const agent of data.nativeState?.agents ?? []) {
    if (agent.fallback?.reason) reasons.push(agent.fallback.reason);
    if (/fallback/i.test(agent.status ?? "")) reasons.push(`${agent.agent}: ${agent.status}`);
  }
  for (const content of data.toolFallbacks ?? []) {
    const first = firstMeaningfulLine(content, "");
    if (first) reasons.push(first);
  }
  return [...new Set(reasons.map((item) => limitText(item, 180)).filter(Boolean))];
}

function firstMeaningfulLine(content, fallback) {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .find((line) => line && !line.startsWith("#") && !/^[-|: ]+$/.test(line))
    ?? fallback;
}

function compactPaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

function limitText(text, max) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "run";
}

function yaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  return Object.entries(value).map(([key, entry]) => {
    if (Array.isArray(entry)) {
      return [`${pad}${key}:`, ...entry.map((item) => `${pad}  - ${quoteYaml(item)}`)].join("\n");
    }
    return `${pad}${key}: ${quoteYaml(entry)}`;
  }).join("\n");
}

function quoteYaml(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value ?? ""));
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
