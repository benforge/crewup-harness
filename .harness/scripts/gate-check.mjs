import { readFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import {
  configureDelegationGuard,
  collectWorkspaceChanges,
  evaluateDelegationGuard,
  readChangedFilesManifest,
  readNativeState,
  nativeExecutionProblems,
  requiredNativeAgentsForStageCompletion
} from "./lib/delegation-guard.mjs";

const root = process.cwd();
const runId = process.argv[2];

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:gate-check -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs");
const statePath = path.join(runDir, "state.json");
const schema = parseYaml(await readFile(path.join(root, ".harness", "config", "artifact-schema.yaml"), "utf8"));
const { project_profile: projectProfile } = await loadProjectProfile(root);
configureDelegationGuard(projectProfile);

const problems = [];
const warnings = [];

if (!existsSync(runDir)) problems.push(`Run does not exist: ${runId}`);
if (!existsSync(statePath)) problems.push("Missing state.json");
if (!existsSync(tasksDir)) problems.push("Missing tasks/. Run npm run harness:prepare-run -- <run-id>.");

const state = existsSync(statePath) ? JSON.parse(await readFile(statePath, "utf8")) : {};

await checkArtifacts();
await checkRequirementPlanGate();
await checkNativeState();
await checkVerifyReport();
await checkReviewReport();
await checkReleaseSummary();
await checkAgentLogs();
await checkStageGate(state);
await checkStateConsistency(state);
await checkDelegationGuard(state);

if (problems.length > 0) {
  console.error("Quality gate failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  if (warnings.length > 0) {
    console.warn("\nWarnings:");
    for (const warning of warnings) console.warn(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Quality gate passed.");
if (warnings.length > 0) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

async function checkArtifacts() {
  const requiredForCurrentStage = new Set(requiredArtifactsForStage(state.stage));
  for (const [file, rules] of Object.entries(schema.artifacts ?? {})) {
    const target = path.join(artifactsDir, file);
    if (!existsSync(target)) {
      if (rules.required === false || !requiredForCurrentStage.has(file)) continue;
      problems.push(`Missing artifact: ${file}`);
      continue;
    }

    const content = await readFile(target, "utf8");
    if (content.trim().length < 40) warnings.push(`Artifact is very short: ${file}`);
    if (hasPlaceholder(content)) {
      if (requiredForCurrentStage.has(file)) {
        problems.push(`Artifact still appears to contain placeholders: ${file}`);
      } else {
        warnings.push(`Artifact still appears to contain placeholders: ${file}`);
      }
    }

    for (const heading of rules.required_headings ?? []) {
      if (!content.includes(`## ${heading}`)) {
        problems.push(`Artifact missing heading: ${file} -> ${heading}`);
      }
    }
  }
}

async function checkRequirementPlanGate() {
  const planPath = path.join(artifactsDir, "requirement-plan.md");
  const requirementPath = path.join(artifactsDir, "requirement.md");
  const promotedPath = path.join(logsDir, "requirements-planning", "promoted.md");
  if (existsSync(planPath) && existsSync(requirementPath)) {
    const plan = await readFile(planPath, "utf8");
    const requirement = await readFile(requirementPath, "utf8");
    if (!isLiteImplementationOnlyRun() && plan.includes("plan-only") && !existsSync(promotedPath) && state.stage && !["intake", "requirements_plan"].includes(state.stage)) {
      warnings.push("requirement-plan.md exists but no promotion log was found.");
    }
    if (!isLiteImplementationOnlyRun() && state.stage && ["implement", "verify", "review", "release", "done"].includes(state.stage) && hasTemplatePlaceholder(requirement)) {
      problems.push("requirement.md still contains template placeholder before implementation/review stage.");
    }
  }
}

async function checkNativeState() {
  const nativeStatePath = path.join(logsDir, "native-subagents", "native-state.json");
  const taskAgents = await availableTaskAgents();
  const requiredAgents = requiredNativeAgentsForStageCompletion(state.stage, { root, runId, state, taskAgents });
  if (!existsSync(nativeStatePath)) {
    if (requiredAgents.length > 0) {
      problems.push(`No native-state.json found, but stage ${state.stage} requires subagent execution records for: ${requiredAgents.join(", ")}`);
    } else {
      warnings.push("No native-state.json found. This is fine only if the run did not use native subagents.");
    }
    return;
  }

  const native = JSON.parse(await readFile(nativeStatePath, "utf8"));
  if (native.fallback && requiredAgents.length > 0) {
    problems.push(`Native fallback is recorded but stage ${state.stage} still requires real subagent results: ${native.fallback.reason}`);
  }

  if (!native.fallback && requiredAgents.length > 0) {
    problems.push(...nativeExecutionProblems({
      nativeState: native,
      requiredAgents,
      label: state.stage
    }));
  }

  for (const agent of native.agents ?? []) {
    if (["running"].includes(agent.status)) warnings.push(`Native agent is still running: ${agent.agent}`);
    if (["verify", "review", "release", "done"].includes(state.stage) && !native.fallback && agent.status === "planned" && !agent.handle && !agent.result_captured_at) {
      problems.push(`Native agent was planned but never executed before ${state.stage}: ${agent.agent}`);
    }
    if (["completed", "blocked", "needs_input", "waiting_review", "ready_to_close", "closed"].includes(agent.status) && !agent.handle) {
      problems.push(`Native agent has captured/terminal status without a real spawn handle: ${agent.agent}`);
    }
    if (state.stage === "done" && agent.close_required && agent.status !== "closed") {
      problems.push(`Native agent must be closed before done/archive: ${agent.agent} (${agent.status})`);
    }
    if (agent.status === "ready_to_close" && !agent.close_confirmed) {
      problems.push(`Native agent is ready_to_close but not closed: ${agent.agent}`);
    }
    if (agent.result_captured_at && (!agent.result_path || !existsSync(resolveWorkspacePath(agent.result_path)))) {
      problems.push(`Native agent result was marked captured but result file is missing: ${agent.agent}`);
    }
    if (["completed", "blocked", "needs_input", "waiting_review", "ready_to_close", "closed"].includes(agent.status) && !agent.result_captured_at) {
      warnings.push(`Native agent has terminal/review status without captured result: ${agent.agent}`);
    }
  }
}

function resolveWorkspacePath(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

async function availableTaskAgents() {
  if (!existsSync(tasksDir)) return new Set();
  const entries = await readdir(tasksDir, { withFileTypes: true }).catch(() => []);
  return new Set(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".task.md"))
      .map((entry) => entry.name.replace(/\.task\.md$/, ""))
  );
}

function requiredArtifactsForStage(stage) {
  if (isDocsOnlyRun()) {
    return stage === "verify" ? ["test-report.md"] : stage === "review" ? ["test-report.md", "review-report.md"] : stage === "release" || stage === "done" ? ["test-report.md", "review-report.md", "release-summary.md"] : [];
  }
  if (stage === "requirements_plan" && isLiteImplementationOnlyRun()) return [];
  const byStage = {
    requirements_plan: ["requirement-plan.md"],
    requirements_confirm: ["requirement-plan.md"],
    plan: ["requirement.md"],
    implement: isLiteImplementationOnlyRun() ? [] : ["requirement.md", "architecture.md", "implementation-plan.md"],
    verify: ["test-report.md"],
    review: ["test-report.md", "review-report.md"],
    release: ["review-report.md", "release-summary.md"],
    done: ["test-report.md", "review-report.md", "release-summary.md"]
  };
  return byStage[stage] ?? [];
}

function isLiteImplementationOnlyRun() {
  if (state.workflowProfile !== "lite") return false;
  const taskAgents = availableTaskAgentsSync();
  const hasImplementation = ["frontend", "backend", "database", "devops"].some((agent) => taskAgents.has(agent));
  return hasImplementation
    && !taskAgents.has("requirements-plan")
    && !taskAgents.has("requirements")
    && !taskAgents.has("architect")
    && !taskAgents.has("pm");
}

function availableTaskAgentsSync() {
  if (!existsSync(tasksDir)) return new Set();
  return new Set(
    readdirSync(tasksDir)
      .filter((name) => name.endsWith(".task.md"))
      .map((name) => name.replace(/\.task\.md$/, ""))
  );
}

async function checkVerifyReport() {
  const target = path.join(artifactsDir, "test-report.md");
  if (!existsSync(target)) return;
  const content = await readFile(target, "utf8");
  if (hasRequiredCheckFailure(content)) {
    problems.push("Required verification failed in test-report.md.");
  }
  if (state.stage && ["review", "release", "done"].includes(state.stage) && hasAcceptanceCriteria() && !/AC-\d+/i.test(content)) {
    warnings.push("test-report.md does not reference numbered acceptance criteria (AC-*).");
  }
}

async function checkReviewReport() {
  const target = path.join(artifactsDir, "review-report.md");
  if (!existsSync(target)) return;
  const content = await readFile(target, "utf8");
  if (["release", "done"].includes(state.stage) && reviewHasBlockingIssues(content)) {
    problems.push("review-report.md is not passed or still contains blocking issues.");
  }
}

async function checkReleaseSummary() {
  const target = path.join(artifactsDir, "release-summary.md");
  if (!existsSync(target)) return;
  const content = await readFile(target, "utf8");
  if (state.stage === "done" && hasPlaceholder(content)) {
    problems.push("release-summary.md still contains placeholders before done.");
  }
}

async function checkAgentLogs() {
  const resultsPath = path.join(logsDir, "orchestrate-results.json");
  if (!existsSync(resultsPath)) return;
  const parsed = JSON.parse(await readFile(resultsPath, "utf8"));
  for (const result of parsed.results ?? []) {
    if (result.status === "blocked") problems.push(`Agent blocked: ${result.agent}`);
    if ((result.blockers ?? []).length > 0) problems.push(`Agent has blockers: ${result.agent}`);
  }
}

async function checkStageGate(currentState) {
  const stage = currentState.stage;
  if (!stage) return;
  const usesTransitionState = Boolean(currentState.confirmations) || (currentState.transitions ?? []).length > 0;
  if (!isDocsOnlyRun() && ["implement", "verify", "review", "release", "done"].includes(stage) && !currentState.confirmations?.implementation_approved_at) {
    const message = "Implementation stage or later should have implementation approval in state.json.";
    if (usesTransitionState) problems.push(message);
    else warnings.push(`${message} Treating as legacy run because no transition state exists.`);
  }
  if (stage === "done") {
    for (const artifact of ["test-report.md", "review-report.md", "release-summary.md"]) {
      if (!existsSync(path.join(artifactsDir, artifact))) problems.push(`Done stage missing artifact: ${artifact}`);
    }
  }
}

async function checkStateConsistency(currentState) {
  if (!currentState.status || !currentState.stage) return;
  if (currentState.status === "done" && currentState.stage !== "done") {
    problems.push(`State mismatch: status is done but stage is ${currentState.stage}. Run harness:repair-state or transition to done.`);
  }
  if (currentState.status === "archived" && currentState.stage !== "done") {
    warnings.push(`State mismatch: archived run is not at done stage (${currentState.stage}).`);
  }
}

async function checkDelegationGuard(currentState) {
  const nativeState = await readNativeState(root, runId);
  const workspaceFiles = collectWorkspaceChanges(root, runId, currentState);
  const manifestFiles = readChangedFilesManifest(root, runId);
  const issues = evaluateDelegationGuard({
    root,
    runId,
    state: currentState,
    workspaceFiles,
    manifestFiles,
    nativeState,
    targetStage: currentState.stage
  });

  if (issues.length > 0) {
    problems.push(...issues);
  }
}

function hasPlaceholder(content) {
  return /模板|占位|placeholder|TBD|待补充|待完善|待\s+\S+\s+Agent\s+补充|请先阅读 `logs\/context\/related-runs\.md`|复用的历史背景：|冲突或变化：|需要延续的约束：|需要避开的旧问题：|- 延续：|- 推翻：|- 新增：/i.test(content)
    || /^\s*-\s*$/m.test(content);
}

function hasTemplatePlaceholder(content) {
  return hasPlaceholder(content);
}

function isDocsOnlyRun() {
  const taskAgents = availableTaskAgentsSync();
  if (!taskAgents.has("docs")) return false;
  return !["frontend", "backend", "database", "devops", "pm", "requirements-plan", "requirements", "architect"].some((agent) => taskAgents.has(agent));
}

function hasAcceptanceCriteria() {
  const target = path.join(artifactsDir, "requirement.md");
  if (!existsSync(target)) return false;
  const content = readFileSync(target, "utf8");
  return /AC-\d+/i.test(content);
}

function hasRequiredCheckFailure(content) {
  return /\|\s*[^|\n]+\s*\|\s*failed\s*\|\s*(是|true|required)\s*\|/i.test(content)
    || /必需检查失败|Required verification failed/i.test(content);
}

function reviewHasBlockingIssues(content) {
  if (/- \[[xX]\]\s*不通过/.test(content)) return true;
  if (!/- \[[xX]\]\s*(通过|有条件通过)/.test(content) && /##\s*结论/.test(content)) return true;
  return sectionHasSubstantiveBullet(content, "阻塞问题");
}

function sectionHasSubstantiveBullet(content, heading) {
  const section = sectionText(content, heading);
  return section.split(/\r?\n/).some((line) => {
    const text = line.trim().replace(/^[-*]\s*/, "").trim().replace(/[。.!！]+$/g, "");
    return text && !["无", "暂无", "无阻塞问题", "none", "n/a", "-"].includes(text.toLowerCase());
  });
}

function sectionText(content, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(content);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


