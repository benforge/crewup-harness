import { access, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";

const root = process.cwd();
const defaultLocalRuleFile = null;
const discoveryExcludes = new Set([
  ".git",
  ".harness",
  ".next",
  ".playwright-cli",
  ".agents",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "output"
]);

const requiredPaths = [
  "AGENTS.md",
  ".harness/project/profile.yaml",
  ".harness/project/overlay.yaml",
  ".harness/AGENTS.md",
  ".harness/HARNESS-ARCHITECTURE-AND-USAGE.md",
  ".harness/config/agents.yaml",
  ".harness/config/archive-policy.yaml",
  ".harness/config/delegation-policy.yaml",
  ".harness/config/model-policy.yaml",
  ".harness/config/native-subagents.yaml",
  ".harness/config/write-policy.yaml",
  ".harness/config/checks.yaml",
  ".harness/config/context-policy.yaml",
  ".harness/config/intake-policy.yaml",
  ".harness/config/risk-policy.yaml",
  ".harness/config/requirements-planning.yaml",
  ".harness/config/artifact-schema.yaml",
  ".harness/config/budget-policy.yaml",
  ".harness/config/desktop-runner.yaml",
  ".harness/config/document-policy.yaml",
  ".harness/config/skills.yaml",
  ".harness/config/workflow.yaml",
  ".harness/config/quality-gates.yaml",
  ".harness/orchestrator/README.md",
  ".harness/orchestrator/main-agent.md",
  ".harness/orchestrator/native-subagents.md",
  ".harness/orchestrator/routing-rules.md",
  ".harness/orchestrator/human-intervention.md",
  ".harness/orchestrator/codex-desktop-runner.md",
  ".harness/agents/frontend.md",
  ".harness/rules/frontend.md",
  ".harness/agents/backend.md",
  ".harness/rules/backend.md",
  ".harness/rules/database.md",
  ".harness/rules/devops.md",
  ".harness/rules/tester.md",
  ".harness/rules/reviewer.md",
  ".harness/rules/security.md",
  ".harness/rules/api.md",
  ".harness/contracts/done-definition.md",
  ".harness/templates/requirement.md",
  ".harness/templates/requirement-interview.md",
  ".harness/templates/requirement-plan.md",
  ".harness/templates/architecture.md",
  ".harness/templates/test-report.md",
  ".harness/templates/agent-task.md",
  ".harness/templates/main-summary.md",
  ".harness/scripts/orchestrate.mjs",
  ".harness/scripts/run.mjs",
  ".harness/scripts/overlay-report.mjs",
  ".harness/scripts/verify.mjs",
  ".harness/scripts/intake.mjs",
  ".harness/scripts/backlog-item.mjs",
  ".harness/scripts/context-pack.mjs",
  ".harness/scripts/transition.mjs",
  ".harness/scripts/desktop-plan.mjs",
  ".harness/scripts/desktop-light.mjs",
  ".harness/scripts/requirements-interview.mjs",
  ".harness/scripts/requirements-plan.mjs",
  ".harness/scripts/native-plan.mjs",
  ".harness/scripts/native-state.mjs",
  ".harness/scripts/repair-state.mjs",
  ".harness/scripts/report.mjs",
  ".harness/scripts/dashboard.mjs",
  ".harness/scripts/knowledge.mjs",
  ".harness/scripts/knowledge-select.mjs",
  ".harness/scripts/archive-commit.mjs",
  ".harness/scripts/changed-files.mjs",
  ".harness/scripts/lib/delegation-guard.mjs",
  ".harness/scripts/next.mjs",
  ".harness/scripts/token-ledger.mjs",
  ".harness/scripts/skills-report.mjs",
  ".harness/scripts/skills-resolve.mjs",
  ".harness/scripts/skills-install.mjs",
  ".harness/scripts/skills-audit.mjs",
  ".harness/scripts/lib/context-mode.mjs",
  ".harness/scripts/lib/project-profile.mjs",
  ".harness/scripts/lib/project-overlay.mjs",
  ".harness/scripts/lib/workload-analysis.mjs",
  ".harness/skills/build.md",
  ".harness/skills/test.md",
  ".harness/skills/ui-verify.md",
  ".harness/skills/release-check.md",
  ".harness/backlog/new",
  ".harness/backlog/ready",
  ".harness/backlog/in-progress",
  ".harness/backlog/review",
  ".harness/backlog/done",
  ".harness/knowledge",
  ".harness/project",
  ".harness/runs"
];

const configFiles = [
  ".harness/config/agents.yaml",
  ".harness/config/archive-policy.yaml",
  ".harness/config/artifact-schema.yaml",
  ".harness/config/budget-policy.yaml",
  ".harness/config/checks.yaml",
  ".harness/config/context-policy.yaml",
  ".harness/config/delegation-policy.yaml",
  ".harness/config/desktop-runner.yaml",
  ".harness/config/document-policy.yaml",
  ".harness/config/intake-policy.yaml",
  ".harness/config/model-policy.yaml",
  ".harness/config/native-subagents.yaml",
  ".harness/config/quality-gates.yaml",
  ".harness/config/risk-policy.yaml",
  ".harness/config/requirements-planning.yaml",
  ".harness/config/skills.yaml",
  ".harness/config/workflow.yaml",
  ".harness/config/write-policy.yaml"
];

const textRootsToScan = [
  ".ai",
  ".harness/AGENTS.md",
  ".harness/HARNESS-WORKFLOW.md",
  ".harness/HARNESS-ARCHITECTURE-AND-USAGE.md",
  ".harness/agents",
  ".harness/config",
  ".harness/contracts",
  ".harness/orchestrator",
  ".harness/knowledge",
  ".harness/rules",
  ".harness/scripts",
  ".harness/templates"
];

const errors = [];
const warnings = [];
const isTemplatePackage = await detectTemplatePackage();

await checkRequiredPaths();
await checkYaml();
await checkJson("package.json");
await checkJson("skills-lock.json", { optional: true });
await checkTextEncoding();
await checkSkills();
await checkProjectOverlay();
await checkKnowledge();
await checkNativeSubagents();
await checkWorkflow();
await checkNativeExecutionGates();
await checkDelegationGuardWiring();
await checkBacklogFileNames();

if (errors.length > 0) {
  console.error("Harness check failed:");
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length > 0) {
    console.warn("\nWarnings:");
    for (const warning of warnings) console.warn(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Harness check passed.");
if (warnings.length > 0) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

async function checkRequiredPaths() {
  for (const rel of requiredPaths) {
    if (isTemplatePackage && isProjectGeneratedPath(rel)) continue;
    try {
      await access(path.join(root, rel));
    } catch {
      errors.push(`Missing required path: ${rel}`);
    }
  }
}

async function checkYaml() {
  for (const rel of configFiles) {
    try {
      parseYaml(await readFile(path.join(root, rel), "utf8"));
    } catch (error) {
      errors.push(`Invalid YAML: ${rel}: ${error.message}`);
    }
  }
}

async function checkJson(rel, { optional = false } = {}) {
  const target = path.join(root, rel);
  if (optional && !existsSync(target)) return;
  try {
    JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON: ${rel}: ${error.message}`);
  }
}

async function checkTextEncoding() {
  const files = [];
  for (const rel of textRootsToScan) {
    const target = path.join(root, rel);
    if (!existsSync(target)) continue;
    const statFiles = await collectTextFiles(target);
    files.push(...statFiles);
  }
  files.push(...await collectLocalAiRuleFiles(root, await resolveConfiguredLocalRuleFile()));

  const suspicious = /[\uFFFD]|(?:\u951B|\u9286|\u59AB|\u7F02|\u701B|\u6FEE|\u7459|\u7487|\u9225|\u20AC)/;
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (suspicious.test(content)) {
      errors.push(`Suspicious mojibake or replacement characters: ${path.relative(root, file).replaceAll("\\", "/")}`);
    }
  }
}

async function collectTextFiles(target) {
  const entries = await readdir(target, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    return /\.(md|yaml|mjs|json)$/i.test(target) ? [target] : [];
  }

  const files = [];
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await collectTextFiles(child));
    if (entry.isFile() && /\.(md|yaml|mjs|json)$/i.test(entry.name)) files.push(child);
  }
  return files;
}

async function collectLocalAiRuleFiles(target, localRuleFile = defaultLocalRuleFile, depth = 0) {
  if (depth > 5) return [];
  if (!localRuleFile) return [];
  const entries = await readdir(target, { withFileTypes: true }).catch(() => []);
  const files = [];
  const ruleFile = path.join(target, normalizeRelPath(localRuleFile));
  if (existsSync(ruleFile)) files.push(ruleFile);

  for (const entry of entries) {
    if (!entry.isDirectory() || discoveryExcludes.has(entry.name)) continue;
    files.push(...await collectLocalAiRuleFiles(path.join(target, entry.name), localRuleFile, depth + 1));
  }
  return files;
}

async function checkSkills() {
  const skillsPath = path.join(root, ".harness/config/skills.yaml");
  if (!existsSync(skillsPath)) return;

  const skillsConfig = parseYaml(await readFile(skillsPath, "utf8"));
  const candidates = skillsConfig.external_skill_candidates ?? {};
  for (const [name, candidate] of Object.entries(candidates)) {
    if (!candidate.install_command?.startsWith("npx skills add ")) {
      warnings.push(`External skill candidate has no standard install command: ${name}`);
    }
  }

  const lockPath = path.join(root, "skills-lock.json");
  if (!existsSync(lockPath)) return;

  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  for (const name of Object.keys(lock.skills ?? {})) {
    const skillFile = path.join(root, ".agents", "skills", name, "SKILL.md");
    if (!existsSync(skillFile)) {
      warnings.push(`skills-lock.json lists ${name}, but .agents/skills/${name}/SKILL.md is missing`);
    }
  }
}

async function checkProjectOverlay() {
  if (isTemplatePackage && !existsSync(path.join(root, ".harness/project/overlay.yaml"))) {
    warnings.push("Template package has no project overlay yet. Run `eh init` inside a target project to generate .harness/project/.");
    return;
  }

  const { project_profile: project } = await loadProjectProfile(root);
  const overlayRel = project?.ai_overlay?.profile ?? ".harness/project/overlay.yaml";
  const overlayPath = path.join(root, overlayRel);
  if (!existsSync(overlayPath)) {
    errors.push(`Missing project AI overlay: ${overlayRel}`);
    return;
  }

  const overlay = parseYaml(await readFile(overlayPath, "utf8"))?.ai_project;
  if (!overlay) {
    errors.push(`${overlayRel} must define ai_project`);
    return;
  }
  if (!overlay.language?.communication) warnings.push(`${overlayRel} should define language.communication`);
  if (!overlay.rules?.common && !overlay.rules?.roles && !overlay.rules?.scopes) {
    warnings.push(`${overlayRel} should define rules.common, rules.roles, or rules.scopes`);
  }

  const ruleFiles = [
    ...(overlay.rules?.common ?? []),
    ...Object.values(overlay.rules?.roles ?? {}).flat(),
    ...Object.values(overlay.rules?.scopes ?? {}).flatMap(scopeRuleFiles)
  ];
  for (const rel of new Set(ruleFiles)) {
    if (!existsSync(path.join(root, rel))) errors.push(`Project overlay rule file missing: ${rel}`);
  }

  for (const [scope, config] of Object.entries(overlay.rules?.scopes ?? {})) {
    if (typeof config !== "object" || Array.isArray(config)) {
      errors.push(`${overlayRel} rules.scopes.${scope} must be an object with files/paths/keywords`);
      continue;
    }
    const hasRuleFiles = scopeRuleFiles(config).length > 0;
    const hasPaths = Array.isArray(config.paths) ? config.paths.length > 0 : Boolean(config.paths);
    if (!hasRuleFiles && !hasPaths) {
      warnings.push(`${overlayRel} rules.scopes.${scope} has neither files nor paths`);
    }
  }
}

async function detectTemplatePackage() {
  const packagePath = path.join(root, "package.json");
  if (!existsSync(packagePath)) return false;
  try {
    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
    return packageJson?.name === "eff-harness";
  } catch {
    return false;
  }
}

function isProjectGeneratedPath(rel) {
  return rel === ".harness/project/profile.yaml" || rel === ".harness/project/overlay.yaml";
}

async function checkKnowledge() {
  const knowledgeRoot = path.join(root, ".harness", "knowledge");
  if (!existsSync(knowledgeRoot)) {
    errors.push("Missing .harness/knowledge.");
    return;
  }
  for (const file of ["README.md", "lessons-learned.md"]) {
    const target = path.join(knowledgeRoot, file);
    if (!existsSync(target)) {
      errors.push(`Knowledge entry file missing: .harness/knowledge/${file}`);
    }
  }
  for (const file of ["dev-map.md", "module-index.json", "run-index.json", "decision-index.md", "task-board.md"]) {
    const target = path.join(knowledgeRoot, file);
    if (!existsSync(target)) {
    warnings.push(`Generated knowledge file missing: .harness/knowledge/${file}. Run npm run harness:knowledge inside the target project when needed.`);
  }
}
}

function scopeRuleFiles(config) {
  if (!config) return [];
  if (Array.isArray(config)) return config;
  if (typeof config === "string") return [config];
  const files = config.files ?? config.rules ?? [];
  return Array.isArray(files) ? files : [files].filter(Boolean);
}

async function checkNativeSubagents() {
  const rel = ".harness/config/native-subagents.yaml";
  const configPath = path.join(root, rel);
  if (!existsSync(configPath)) return;

  const config = parseYaml(await readFile(configPath, "utf8"))?.native_subagents;
  if (!config) {
    errors.push(`${rel} must define native_subagents`);
    return;
  }

  if (config.mode !== "codex_spawn_agent") {
    warnings.push(`${rel} mode is ${config.mode}; expected codex_spawn_agent for native lifecycle`);
  }

  for (const role of ["frontend", "backend", "database", "devops", "tester"]) {
    if (config.agent_type_by_role?.[role] !== "worker") {
      errors.push(`${rel} must map ${role} to worker`);
    }
  }

  for (const role of ["pm", "requirements", "architect", "reviewer", "release"]) {
    if (!["explorer", "default"].includes(config.agent_type_by_role?.[role])) {
      errors.push(`${rel} must map ${role} to explorer or default`);
    }
  }

  const maxParallel = Number(config.safety?.max_parallel_subagents);
  if (!Number.isInteger(maxParallel) || maxParallel < 1 || maxParallel > 8) {
    errors.push(`${rel} safety.max_parallel_subagents must be an integer between 1 and 8`);
  }

  if (config.safety?.require_close_agent !== true) {
    errors.push(`${rel} safety.require_close_agent must be true`);
  }

  if (!config.runtime?.state_file || !config.runtime?.result_file_pattern || !config.runtime?.close_audit_required) {
    errors.push(`${rel} runtime must define state_file, result_file_pattern, and close_audit_required`);
  }

  const statuses = new Set(config.runtime?.status_values ?? []);
  for (const status of ["waiting_review", "ready_to_close", "closed"]) {
    if (!statuses.has(status)) errors.push(`${rel} runtime.status_values must include ${status}`);
  }

  if (config.retention?.prefer_resume_before_respawn !== true) {
    errors.push(`${rel} retention.prefer_resume_before_respawn must be true`);
  }

  const intakeAgents = new Set(config.parallel_groups?.intake?.agents ?? []);
  if (!intakeAgents.has("requirements-plan")) {
    errors.push(`${rel} parallel_groups.intake.agents must include requirements-plan so plan-only work is scheduled`);
  }
  const verificationGroups = [
    ["verification_tester", "tester"],
    ["verification_reviewer", "reviewer"],
    ["verification_release", "release"]
  ];
  for (const [groupId, role] of verificationGroups) {
    const group = config.parallel_groups?.[groupId];
    if (!group) {
      errors.push(`${rel} parallel_groups.${groupId} is required`);
      continue;
    }
    if (group.parallel !== false) {
      errors.push(`${rel} parallel_groups.${groupId}.parallel must be false`);
    }
    const agents = new Set(group.agents ?? []);
    if (!agents.has(role) || agents.size !== 1) {
      errors.push(`${rel} parallel_groups.${groupId}.agents must contain only ${role}`);
    }
  }

  const capacity = config.retention?.capacity ?? {};
  const maxRetained = Number(capacity.max_retained_subagents);
  const maxRetainedImplementation = Number(capacity.max_retained_implementation_agents);
  const maxRetainedNonImplementation = Number(capacity.max_retained_non_implementation_agents);
  if (!Number.isInteger(maxRetained) || maxRetained < 1 || maxRetained > 8) {
    errors.push(`${rel} retention.capacity.max_retained_subagents must be an integer between 1 and 8`);
  }
  if (!Number.isInteger(maxRetainedImplementation) || maxRetainedImplementation < 1 || maxRetainedImplementation > maxRetained) {
    errors.push(`${rel} retention.capacity.max_retained_implementation_agents must be an integer between 1 and max_retained_subagents`);
  }
  if (!Number.isInteger(maxRetainedNonImplementation) || maxRetainedNonImplementation < 1 || maxRetainedNonImplementation > maxRetained) {
    errors.push(`${rel} retention.capacity.max_retained_non_implementation_agents must be an integer between 1 and max_retained_subagents`);
  }
  if (!Array.isArray(capacity.close_recommendation_priority) || capacity.close_recommendation_priority.length === 0) {
    errors.push(`${rel} retention.capacity.close_recommendation_priority must be a non-empty list`);
  }

  const implementationRetention = config.retention?.implementation_agents;
  if (implementationRetention?.retain_after_result !== true) {
    errors.push(`${rel} retention.implementation_agents.retain_after_result must be true`);
  }
  if (implementationRetention?.retained_status_after_completed_result !== "waiting_review") {
    errors.push(`${rel} retention.implementation_agents.retained_status_after_completed_result must be waiting_review`);
  }
  if (implementationRetention?.close_status_before_close_agent !== "ready_to_close") {
    errors.push(`${rel} retention.implementation_agents.close_status_before_close_agent must be ready_to_close`);
  }
}

async function checkWorkflow() {
  const workflowPath = path.join(root, ".harness/config/workflow.yaml");
  if (!existsSync(workflowPath)) return;

  const workflow = parseYaml(await readFile(workflowPath, "utf8"))?.workflow;
  const { project_profile: project } = await loadProjectProfile(root);
  if (!workflow?.stages?.length) errors.push(".harness/config/workflow.yaml must define workflow.stages");
  if (!workflow?.transitions) errors.push(".harness/config/workflow.yaml must define workflow.transitions");
  for (const stage of ["intake", "requirements_plan", "requirements_confirm", "plan", "implement", "verify", "review", "release", "done"]) {
    if (!(workflow.stages ?? []).some((item) => item.id === stage)) {
      errors.push(`workflow.stages must include ${stage}`);
    }
  }
  if (!project?.impact_scopes) {
    const localRuleFile = await resolveConfiguredLocalRuleFile();
    const localRules = await collectLocalAiRuleFiles(root, localRuleFile);
    if (localRules.length === 0) {
      warnings.push(`Project profile has no impact_scopes and no local ${localRuleFile} files were discovered`);
    }
  }

  const standardAgents = new Set(workflow?.workflow_profiles?.standard?.default_agents ?? []);
  for (const role of ["tester", "reviewer", "release"]) {
    if (!standardAgents.has(role)) {
      errors.push(`workflow_profiles.standard.default_agents must include ${role} for implementation closed-loop verification`);
    }
  }

  const verificationAgents = new Set(project?.default_agents?.verification ?? []);
  for (const role of ["tester", "reviewer", "release"]) {
    if (!verificationAgents.has(role)) {
      errors.push(`project_profile.default_agents.verification must include ${role} for tester -> reviewer -> release closure`);
    }
  }
}

async function checkNativeExecutionGates() {
  const workflowPath = path.join(root, ".harness", "config", "workflow.yaml");
  if (!existsSync(workflowPath)) return;
  const workflow = parseYaml(await readFile(workflowPath, "utf8"))?.workflow;
  const stages = new Set((workflow?.stages ?? []).map((item) => item.id));
  if (!stages.has("requirements_plan") || !stages.has("plan")) return;

  const mainAgentPath = path.join(root, ".harness", "orchestrator", "main-agent.md");
  if (!existsSync(mainAgentPath)) return;
  const mainAgent = await readFile(mainAgentPath, "utf8");
  if (!mainAgent.includes("native-plan") || !mainAgent.includes("spawn_agent")) {
    errors.push(".harness/orchestrator/main-agent.md must describe native-plan and spawn_agent as the primary execution path");
  }

  const nativePath = path.join(root, ".harness", "config", "native-subagents.yaml");
  if (!existsSync(nativePath)) return;
  const native = parseYaml(await readFile(nativePath, "utf8"))?.native_subagents;
  const lifecycle = native?.lifecycle ?? {};
  const afterResult = Array.isArray(lifecycle.after_result) ? lifecycle.after_result.join("\n") : "";
  if (!afterResult.includes("waiting_review") || !afterResult.includes("ready_to_close")) {
    errors.push(".harness/config/native-subagents.yaml after_result must preserve completed subagents in waiting_review and require ready_to_close before closing");
  }
}

async function checkDelegationGuardWiring() {
  const guardPath = path.join(root, ".harness", "scripts", "lib", "delegation-guard.mjs");
  if (!existsSync(guardPath)) {
    errors.push("Missing delegation guard: .harness/scripts/lib/delegation-guard.mjs");
    return;
  }

  const requiredReferences = [
    [".harness/scripts/transition.mjs", "evaluateDelegationGuard"],
    [".harness/scripts/gate-check.mjs", "evaluateDelegationGuard"],
    [".harness/scripts/changed-files.mjs", "evaluateDelegationGuard"]
  ];

  for (const [rel, marker] of requiredReferences) {
    const target = path.join(root, rel);
    if (!existsSync(target)) {
      errors.push(`Delegation guard target missing: ${rel}`);
      continue;
    }
    const content = await readFile(target, "utf8");
    if (!content.includes(marker)) {
      errors.push(`${rel} must enforce delegated business-code writes via ${marker}`);
    }
  }

  const mainAgentPath = path.join(root, ".harness", "orchestrator", "main-agent.md");
  if (existsSync(mainAgentPath)) {
    const mainAgent = await readFile(mainAgentPath, "utf8");
    if (!mainAgent.includes("harness:changed-files") || !mainAgent.includes("native-state mark-fallback")) {
      errors.push(".harness/orchestrator/main-agent.md must document changed-files guard and native fallback handling");
    }
  }
}

async function checkBacklogFileNames() {
  const backlogRoot = path.join(root, ".harness", "backlog");
  const queues = ["new", "ready", "in-progress", "review", "done"];
  for (const queue of queues) {
    const dir = path.join(backlogRoot, queue);
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (!/^\d{3,}-/.test(entry.name)) {
        errors.push(`Backlog file must start with a sequence number: .harness/backlog/${queue}/${entry.name}`);
      }
    }
  }
}

async function resolveConfiguredLocalRuleFile() {
  try {
    const { project_profile: project } = await loadProjectProfile(root);
    const overlayRel = project?.ai_overlay?.profile ?? ".harness/project/overlay.yaml";
    const overlayPath = path.join(root, overlayRel);
    const overlay = existsSync(overlayPath)
      ? parseYaml(await readFile(overlayPath, "utf8"))?.ai_project
      : null;
    return project?.ai_overlay?.local_rule_file ?? overlay?.discovery?.local_rule_file ?? defaultLocalRuleFile;
  } catch {
    return defaultLocalRuleFile;
  }
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}
