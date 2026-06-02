import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { loadProjectOverlay, resolveImpactScopes } from "./lib/project-overlay.mjs";
import { resolveScriptPath } from "./lib/script-root.mjs";
import {
  artifactHasOwnerProvenance,
  collectArtifactProvenance,
  describeArtifactProvenance
} from "./lib/artifact-provenance.mjs";
import {
  configureDelegationGuard,
  collectWorkspaceChanges,
  evaluateDelegationGuard,
  nativeExecutionProblems,
  requiredNativeAgentsForStageEntry,
  readChangedFilesManifest,
  readNativeState
} from "./lib/delegation-guard.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const to = valueOf("--to=");
const approveImplementation = args.includes("--approve-implementation");
const approveProductSync = args.includes("--approve-product-sync");
const force = args.includes("--force");

if (!runId || !to) {
  console.error("Usage: npm run harness:transition -- <run-id> --to=<stage> [--approve-implementation] [--approve-product-sync] [--force]");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const statePath = path.join(runDir, "state.json");
const logsDir = path.join(runDir, "logs");
const transitionLog = path.join(logsDir, "transitions.md");

if (!existsSync(statePath)) {
  console.error(`Missing state.json: ${path.relative(root, statePath)}`);
  process.exit(1);
}

await mkdir(logsDir, { recursive: true });

const workflow = parseYaml(await readFile(path.join(root, ".harness", "config", "workflow.yaml"), "utf8")).workflow;
const archivePolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "archive-policy.yaml"), "utf8")).archive;
const artifactSchema = parseYaml(await readFile(path.join(root, ".harness", "config", "artifact-schema.yaml"), "utf8")).artifacts ?? {};
const { project_profile: projectProfile } = await loadProjectProfile(root);
configureDelegationGuard(projectProfile);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const impactScopesConfig = resolveImpactScopes(projectProfile, projectOverlay.profile);
const state = JSON.parse(await readFile(statePath, "utf8"));
const artifactProvenance = await collectArtifactProvenance(root, runId);
const from = state.stage ?? "intake";
const allowed = workflow.transitions?.[from]?.allowed_next ?? [];
const validStages = new Set((workflow.stages ?? []).map((stage) => stage.id));

if (!validStages.has(to)) fail(`Unknown target stage: ${to}`);
if (!force && !allowed.includes(to) && from !== to && !isLiteDirectImplementationTransition(from, to, state)) {
  fail(`Invalid transition: ${from} -> ${to}. Allowed: ${allowed.join(", ") || "(none)"}`);
}

await enforceGate(to, state);

const now = new Date().toISOString();
state.stage = to;
state.updatedAt = now;
state.status = to === "done" ? "done" : "in-progress";
state.confirmations = state.confirmations ?? {};
if (approveImplementation) state.confirmations.implementation_approved_at = now;
if (approveProductSync || to === "done") state.confirmations.product_sync_approved_at = now;
state.transitions = [
  ...(state.transitions ?? []),
  { from, to, at: now, force, approveImplementation, approveProductSync }
];

await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
await appendTransitionLog({ from, to, at: now, force });

console.log(`Transitioned ${runId}: ${from} -> ${to}`);
if (to === "done") {
  await writeArchiveReminder();
  runProductSync();
  runArchiveCommit();
}

async function enforceGate(targetStage, currentState) {
  if (force) return;

  await requireDelegatedBusinessCodeWrites(targetStage, currentState);

  if (targetStage === "requirements_confirm") {
    requireNativeExecutionForStage("requirements_confirm");
    await requireArtifactContent("requirement-plan.md", { noPlaceholders: true, requireOwner: true });
  }

  if (targetStage === "plan") {
    requireNativeExecutionForStage("plan");
    await requireArtifactContent("requirement.md", { noPlaceholders: true, requireOwner: true });
  }

  if (targetStage === "implement") {
    if (!isDocsOnlyRun(currentState) && !approveImplementation && !currentState.confirmations?.implementation_approved_at) {
      fail("Transition to implement requires --approve-implementation or an existing implementation approval in state.json.");
    }
    requireNativeExecutionForStage("implement");
    if (!isDocsOnlyRun(currentState) && !isLiteImplementationOnlyRun(currentState)) {
      await requireArtifactContent("requirement.md", { noPlaceholders: true, requireImpactScope: true, requireAcceptanceCriteria: true, requireOwner: true });
      await requireArtifactContent("architecture.md", { noPlaceholders: true, requireOwner: true });
      await requireArtifactContent("implementation-plan.md", { noPlaceholders: true, requireOwner: true });
    }
  }

  if (targetStage === "verify") {
    requireNativeExecutionForStage("verify");
  }

  if (targetStage === "review") {
    requireNativeExecutionForStage("review");
    await requireArtifactContent("test-report.md", { noPlaceholders: true, noRequiredCheckFailures: true, requireOwner: true });
  }

  if (targetStage === "release") {
    requireNativeExecutionForStage("release");
    await requireArtifactContent("review-report.md", { noPlaceholders: true, reviewPassed: true, requireOwner: true });
  }

  if (targetStage === "done") {
    requireNativeExecutionForStage("done");
    await requireArtifactContent("test-report.md", { noPlaceholders: true, noRequiredCheckFailures: true, requireOwner: true });
    await requireArtifactContent("review-report.md", { noPlaceholders: true, reviewPassed: true, requireOwner: true });
    await requireArtifactContent("release-summary.md", { noPlaceholders: true, requireOwner: true });
    requireNoOpenNativeAgents();
    await requireNoRunningDevService();
    await refreshDashboard();
  }
}

async function requireDelegatedBusinessCodeWrites(targetStage, currentState) {
  if (!["implement", "verify", "review", "release", "done"].includes(targetStage)) return;

  const problems = evaluateDelegationGuard({
    root,
    runId,
    state: currentState,
    workspaceFiles: collectWorkspaceChanges(root, runId, currentState),
    manifestFiles: readChangedFilesManifest(root, runId),
    nativeState: await readNativeState(root, runId),
    targetStage,
    requiredAgentsMode: "entry"
  });

  if (problems.length > 0) {
    fail([
      `Delegation guard failed before ${targetStage}.`,
      ...problems,
      "Record real native subagent execution results, or remove/revert the business-code changes before continuing."
    ].join("\n"));
  }
}

function requireArtifact(name) {
  const target = path.join(runDir, "artifacts", name);
  if (!existsSync(target)) fail(`Missing required artifact for transition: ${name}`);
  return target;
}

async function requireArtifactContent(name, options = {}) {
  const target = requireArtifact(name);
  const content = await readFile(target, "utf8");
  for (const heading of artifactSchema[name]?.required_headings ?? []) {
    if (!content.includes(`## ${heading}`)) fail(`Artifact ${name} missing required heading: ${heading}`);
  }
  if (options.noPlaceholders && hasPlaceholder(content)) fail(`Artifact ${name} still contains template placeholders.`);
  if (options.requireImpactScope && availableImpactScopes().length > 0 && !hasMarkedImpactScope(content)) {
    fail(`requirement.md must mark at least one discovered impact scope before implementation. Available scopes: ${availableImpactScopes().join(", ")}`);
  }
  if (options.requireAcceptanceCriteria && !hasAcceptanceCriteria(content)) {
    fail("requirement.md must include concrete acceptance criteria before implementation.");
  }
  if (options.noRequiredCheckFailures && hasRequiredCheckFailure(content)) {
    fail(`${name} contains failed required verification checks.`);
  }
  if (options.reviewPassed && reviewHasBlockingIssues(content)) {
    fail("review-report.md is not passed or still contains blocking issues.");
  }
  if (options.requireOwner) requireArtifactOwnerProvenance(name);
}

function requireArtifactOwnerProvenance(name) {
  const owner = artifactSchema[name]?.owner;
  if (!owner) return;
  if (artifactHasOwnerProvenance(artifactProvenance, name, owner)) return;
  if (!shouldRequireArtifactProvenance()) {
    console.warn(`Warning: Artifact ${name} lacks provenance from owner ${owner}. Found: ${describeArtifactProvenance(artifactProvenance, name)}. Treating as legacy/manual artifact.`);
    return;
  }
  fail(`Artifact ${name} lacks provenance from owner ${owner}. Found: ${describeArtifactProvenance(artifactProvenance, name)}`);
}

function shouldRequireArtifactProvenance() {
  return Boolean(
    existsSync(path.join(logsDir, "orchestrate-results.json"))
      || existsSync(path.join(logsDir, "native-subagents", "native-state.json"))
      || existsSync(path.join(logsDir, "agent-bridge", "bridge-state.json"))
  );
}

function requireNoOpenNativeAgents() {
  const nativeStatePath = path.join(logsDir, "native-subagents", "native-state.json");
  if (!existsSync(nativeStatePath)) return;
  const native = JSON.parse(readFileSync(nativeStatePath, "utf8"));
  const open = (native.agents ?? []).filter((agent) => {
    if (agent.status === "closed") return false;
    if (agent.close_required) return true;
    return ["planned", "running", "waiting_review", "ready_to_close", "needs_input", "blocked", "error"].includes(agent.status);
  });
  if (open.length > 0) {
    fail(`Native subagents must be closed before run done/archive: ${open.map((agent) => `${agent.agent}:${agent.status}`).join(", ")}`);
  }
}

async function requireNoRunningDevService() {
  const servicePath = path.join(logsDir, "dev-service.json");
  if (!existsSync(servicePath)) return;
  const service = JSON.parse(await readFile(servicePath, "utf8"));
  if (service.status !== "running" || !service.pid) return;
  if (!isPidRunning(service.pid)) return;
  fail(`Dev service is still running before done/archive: pid ${service.pid}. Run \`npm run harness:dev-service -- ${runId} stop\`.`);
}

function isPidRunning(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function requireNativeExecutionForStage(targetStage) {
  const requiredAgents = requiredNativeAgentsForStageEntry(targetStage, { root, runId, state });
  if (requiredAgents.length === 0) return;

  const nativeStatePath = path.join(logsDir, "native-subagents", "native-state.json");
  if (!existsSync(nativeStatePath)) {
    fail([
      `Missing native subagent execution record before ${targetStage}: ${requiredAgents.join(", ")}.`,
      "Run `npm run harness:context-pack -- <run-id> --agents=<agents>` and `npm run harness:native-plan -- <run-id> --agents=<agents>`, then spawn native subagents.",
      "If native tools are unavailable, run native-plan first and record fallback with `npm run harness:native-state -- <run-id> mark-fallback <reason>`."
    ].join("\n"));
  }

  const native = JSON.parse(readFileSync(nativeStatePath, "utf8"));
  if (native.fallback) {
    fail([
      `Native subagent gate failed before ${targetStage}: fallback is recorded (${native.fallback.reason}).`,
      "Fallback records why the harness is blocked; it does not authorize the main agent to complete delegated work in the main window.",
      "Resume by enabling native subagents, capturing external agent results into native-state, or explicitly restructuring this as a no-harness/simple task."
    ].join("\n"));
  }

  const issues = nativeExecutionProblems({
    nativeState: native,
    requiredAgents,
    label: `${targetStage} entry`
  });

  if (issues.length > 0) {
    fail([
      `Native subagent gate failed before ${targetStage}.`,
      ...issues,
      "The main agent must not complete delegated planning, implementation, testing, review, or release work only in the main window.",
      "Spawn the required subagents and capture results. If native tools are unavailable, record fallback and stop instead of continuing in the main window."
    ].join("\n"));
  }
}

function isLiteDirectImplementationTransition(fromStage, targetStage, currentState) {
  return fromStage === "requirements_plan"
    && targetStage === "implement"
    && isLiteImplementationOnlyRun(currentState);
}

function isDocsOnlyRun(currentState) {
  const taskAgents = availableTaskAgents();
  if (!taskAgents.has("docs")) return false;
  return !["frontend", "backend", "database", "devops", "pm", "requirements-plan", "requirements", "architect"].some((agent) => taskAgents.has(agent));
}

function isLiteImplementationOnlyRun(currentState) {
  if (currentState.workflowProfile !== "lite" || isDocsOnlyRun(currentState)) return false;
  const taskAgents = availableTaskAgents();
  const implementationAgents = ["frontend", "backend", "database", "devops"].filter((agent) => taskAgents.has(agent));
  return implementationAgents.length > 0
    && !taskAgents.has("requirements-plan")
    && !taskAgents.has("requirements")
    && !taskAgents.has("architect")
    && !taskAgents.has("pm");
}

function availableTaskAgents() {
  const tasksDir = path.join(runDir, "tasks");
  if (!existsSync(tasksDir)) return new Set();
  return new Set(
    listTaskFiles(tasksDir).map((name) => name.replace(/\.task\.md$/, ""))
  );
}

function listTaskFiles(tasksDir) {
  try {
    return readdirSync(tasksDir).filter((name) => name.endsWith(".task.md"));
  } catch {
    return [];
  }
}

function hasPlaceholder(content) {
  if (/(模板|占位|placeholder|TBD|待补充|待完善|待\s+\S+\s+Agent\s+补充)/i.test(content)) return true;
  if (/^\s*-\s*$/m.test(content)) return true;
  return [
    "说明为什么要做这个需求",
    "一句话说明本次 run 要交付什么",
    "待 Architect Agent 补充",
    "待 Tester Agent 补充",
    "待 Release Agent 补充",
    "作为「」，我希望",
    "请先阅读 `logs/context/related-runs.md`",
    "复用的历史背景：",
    "冲突或变化：",
    "需要延续的约束：",
    "需要避开的旧问题：",
    "- 延续：",
    "- 推翻：",
    "- 新增："
  ].some((snippet) => content.includes(snippet));
}

function hasMarkedImpactScope(content) {
  const scopes = availableImpactScopes();
  return scopes.some((scope) => new RegExp(`- \\[[xX]\\]\\s+${escapeRegExp(scope)}\\b`, "i").test(content));
}

function availableImpactScopes() {
  return Object.keys(impactScopesConfig ?? {});
}

function hasAcceptanceCriteria(content) {
  const section = sectionText(content, "验收标准");
  return /AC-\d+/i.test(section) || (/- \[[ xX]\]\s+\S+/.test(section) && !/- \[[ xX]\]\s*$/.test(section.trim()));
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

async function appendTransitionLog(entry) {
  const previous = existsSync(transitionLog) ? await readFile(transitionLog, "utf8") : `# Transition Log: ${runId}\n\n`;
  const line = `- ${entry.at}: ${entry.from} -> ${entry.to}${entry.force ? " (force)" : ""}\n`;
  await writeFile(transitionLog, `${previous.trimEnd()}\n${line}`, "utf8");
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function runProductSync() {
  const result = spawnSync(process.execPath, [
    resolveScriptPath(root, "product-sync.mjs"),
    runId,
    "--approved-product-sync"
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    console.error("Run reached done, but product docs sync failed. Fix the issue and rerun `npm run harness:product-sync -- <run-id> --approved-product-sync`.");
    process.exit(result.status ?? 1);
  }
}

async function writeArchiveReminder() {
  if (!archivePolicy?.reminder_required) return;
  const reminderRel = (archivePolicy.reminder_file ?? ".harness/runs/<run>/artifacts/archive-reminder.md").replaceAll("<run>", runId);
  const reminderPath = path.join(root, reminderRel);
  const gitStatus = gitStatusShort();
  const content = [
    "# 归档提醒",
    "",
    `- runId: ${runId}`,
    `- from: ${from}`,
    `- to: ${to}`,
    `- archivedAt: ${new Date().toISOString()}`,
    "",
    "## 归档前必须确认",
    "",
    "- [x] run 已进入 done 阶段。",
    "- [x] 测试报告、评审报告和发布摘要已通过门禁。",
    "- [x] close_required 的 native subagents 已关闭并记录。",
    "- [ ] 本次业务代码和产品文档变更已写入 changed-files manifest。",
    "- [ ] 如果工作区混有其它迭代，请不要使用 --allow-all-workspace-changes。",
    "",
    "## 自动 Git 提交策略",
    "",
    `- enabled: ${archivePolicy.git?.enabled ? "true" : "false"}`,
    `- auto_commit_after_done: ${archivePolicy.git?.auto_commit_after_done ? "true" : "false"}`,
    `- stage_mode: ${archivePolicy.git?.stage_mode ?? "all_workspace_changes"}`,
    `- commit_message: ${(archivePolicy.git?.commit_message_template ?? "chore(harness): archive <run>").replaceAll("<run>", runId)}`,
    "",
    "## 当前 Git 工作区",
    "",
    gitStatus.length ? gitStatus.map((line) => `- ${line}`).join("\n") : "- 无变更",
    "",
    "## 提醒",
    "",
    "归档完成后，harness 会自动执行归档提交。若提交因未记录文件而失败，请先运行 `harness:changed-files` 记录本次变更，再重跑：",
    "",
    "```bash",
    `npm run harness:archive-commit -- ${runId}`,
    "```",
    ""
  ].join("\n");
  await mkdir(path.dirname(reminderPath), { recursive: true });
  await writeFile(reminderPath, content, "utf8");
  console.log(`归档提醒已生成：${path.relative(root, reminderPath).replaceAll("\\", "/")}`);
  console.log("归档提醒：请确认当前 git 工作区只包含本次迭代相关变更；done 后将按策略自动提交。");
}

function runArchiveCommit() {
  if (!archivePolicy.git?.enabled || !archivePolicy.git?.auto_commit_after_done) return;
  const result = spawnSync(process.execPath, [
    resolveScriptPath(root, "archive-commit.mjs"),
    runId
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    console.error("Run 已进入 done，但归档 git 提交失败。修复后请运行：");
    console.error(`npm run harness:archive-commit -- ${runId}`);
    process.exit(result.status ?? 1);
  }
}

async function refreshDashboard() {
  const result = spawnSync(process.execPath, [
    resolveScriptPath(root, "dashboard.mjs")
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      HARNESS_DASHBOARD_QUIET: "1"
    }
  });

  if (result.status !== 0) {
    console.error("Done reached, but dashboard generation failed.");
    process.exit(result.status ?? 1);
  }
}

function gitStatusShort() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) return [`无法读取 git status：${result.stderr?.trim() || result.stdout?.trim() || "unknown error"}`];
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}


