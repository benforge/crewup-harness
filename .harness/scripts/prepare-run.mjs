import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { inferOverlayScopeMatches, loadProjectOverlay, overlayRuleFilesForAgent, overlaySummary, resolveImpactScopes } from "./lib/project-overlay.mjs";
import { analyzeWorkload, renderWorkloadAnalysisMarkdown } from "./lib/workload-analysis.mjs";
import { hasPositiveMatch, isScopeNegated, negatedScopes, stripNegatedScopeText } from "./lib/scope-negation.mjs";
import { implementationAgentIds, isDocsOnlyAgentSet } from "./lib/agent-roles.mjs";
import { profileFromMode } from "./lib/workflow-modes.mjs";
import { loadGeneratedMarkdownSchema, renderGeneratedMarkdown } from "./lib/generated-markdown.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const requestedProfile = valueOf("--profile=") ?? profileFromMode(valueOf("--mode="), valueOf("--risk=") ?? "normal") ?? "auto";

if (!runId) {
  console.error("Please provide runId, for example: npm run harness:prepare-run -- 2026-05-14-001-blog-mvp");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const tasksDir = path.join(runDir, "tasks");

if (!existsSync(runDir) || !existsSync(inputPath)) {
  console.error(`Run or input.md not found: ${path.relative(root, runDir)}`);
  process.exit(1);
}

const input = await readFile(inputPath, "utf8");
await mkdir(tasksDir, { recursive: true });

const agentsConfig = parseYaml(await readFile(path.join(root, ".harness", "config", "agents.yaml"), "utf8")).agents;
const modelPolicy = parseYaml(await readFile(path.join(root, ".harness", "config", "model-policy.yaml"), "utf8"));
const artifactSchema = parseYaml(await readFile(path.join(root, ".harness", "config", "artifact-schema.yaml"), "utf8"))?.artifacts ?? {};
const generatedMarkdownSchema = await loadGeneratedMarkdownSchema(root);
const { project_profile: projectProfile } = await loadProjectProfile(root);
const projectOverlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const impactScopesConfig = resolveImpactScopes(projectProfile, projectOverlay.profile);

const workloadAnalysis = analyzeWorkload(input, { requestedProfile });
const workflowProfile = workloadAnalysis.workflowProfile;
const impactScopes = detectImpactScopes(input, impactScopesConfig, projectOverlay.profile);
const selectedAgents = workflowProfile === "lite-v2"
  ? []
  : selectAgents(input, agentsConfig, impactScopesConfig, projectProfile, workflowProfile, impactScopes, workloadAnalysis);

for (const entry of await readdir(tasksDir, { withFileTypes: true })) {
  if (entry.isFile() && (entry.name.endsWith(".task.md") || entry.name === "main-agent-summary.md")) {
    await rm(path.join(tasksDir, entry.name));
  }
}

for (const agentId of selectedAgents) {
  const agent = agentsConfig[agentId];
  const task = buildAgentTask(agentId, agent, input, projectProfile, impactScopes);
  await writeFile(path.join(tasksDir, `${agentId}.task.md`), task, "utf8");
}

await writeFile(path.join(tasksDir, "main-agent-summary.md"), buildMainSummary(selectedAgents, workflowProfile, impactScopes), "utf8");
if (workflowProfile === "lite-v2") {
  await writeLiteV2Artifacts({ input, impactScopes });
} else if (workflowProfile === "plan_only") {
  await writePlanArtifacts({ input, impactScopes });
} else if (workflowProfile === "discovery") {
  await writeDiscoveryArtifacts({ input, impactScopes });
}
await mkdir(path.join(runDir, "logs"), { recursive: true });
await writeFile(path.join(runDir, "logs", "workload-analysis.json"), `${JSON.stringify(workloadAnalysis, null, 2)}\n`, "utf8");
await writeFile(path.join(runDir, "logs", "workload-analysis.md"), renderWorkloadAnalysisMarkdown(workloadAnalysis), "utf8");
await updateRunState({ workflowProfile, workloadAnalysis });

console.log(`Generated ${selectedAgents.length} agent tasks: ${path.relative(root, tasksDir)}`);
console.log(`workflow_profile: ${workflowProfile}`);
console.log(`run_type: ${workloadAnalysis.runType}`);
console.log(`complexity: ${workloadAnalysis.complexityScore}/5 (${workloadAnalysis.complexityLevel})`);
console.log(`impact_scopes: ${impactScopes.length ? impactScopes.join(",") : "(none)"}`);
for (const agentId of selectedAgents) console.log(`- ${agentId}`);

function selectAgents(inputText, agents, impactScopeConfig, profile, runProfile, impactScopes, workloadAnalysis = {}) {
  if (["discovery", "plan_only"].includes(runProfile)) {
    return ["requirements-plan", "requirements", "architect", "reviewer"].filter((agentId) => agents[agentId]);
  }

  const selected = new Set();
  selected.add("requirements-plan");
  selected.add("requirements");
  selected.add("architect");

  for (const scope of impactScopes) {
    const config = impactScopeConfig[scope];
    for (const agent of config?.agents ?? []) selected.add(agent);
  }

  for (const agentId of Object.keys(agents)) {
    const flags = agents[agentId].impact_flags ?? [];
    if (flags.some((flag) => hasImpact(inputText, flag))) selected.add(agentId);
  }

  removeNegatedAgents(selected, inputText);

  if (needsDocsAgent(inputText)) selected.add("docs");

  const implementationAgents = [...implementationAgentIds].filter((agent) => selected.has(agent));
  if (runProfile === "lite") {
    if (!isDocsOnlyRequest(inputText)) {
      selected.add("tester");
    }
    selected.add("reviewer");
    selected.add("release");
  } else {
    const verificationAgents = profile.default_agents?.verification ?? ["reviewer"];
    for (const agent of verificationAgents) selected.add(agent);

    if (implementationAgents.length > 0 || runProfile === "full") {
      selected.add("tester");
      selected.add("reviewer");
      selected.add("release");
    } else {
      if (needsDedicatedTester(inputText)) selected.add("tester");
      if (needsReleaseAgent(inputText)) selected.add("release");
    }
  }

  return [...selected].filter((agentId) => agents[agentId]);
}

function needsDedicatedTester(inputText) {
  return /(\u6d4b\u8bd5|\u56de\u5f52|bug|\u4fee\u590d|\u63a5\u53e3|API|\u540e\u7aef|\u6570\u636e\u5e93|\u72b6\u6001|\u8868\u5355|\u6743\u9650|\u767b\u5f55|\u6027\u80fd|\u517c\u5bb9|\u9a8c\u6536|\u7aef\u5230\u7aef|e2e)/i.test(stripNegatedScopeText(inputText));
}

function needsReleaseAgent(inputText) {
  return /(\u53d1\u5e03|\u4e0a\u7ebf|\u90e8\u7f72|release|changelog|\u7248\u672c|\u751f\u4ea7|\u56de\u6eda|\u4ea4\u4ed8)/i.test(stripNegatedScopeText(inputText));
}

function needsDocsAgent(inputText) {
  return /(\u6587\u6863|\u8bf4\u660e|README|readme|docs?|markdown|\.md|\u4f7f\u7528\u8bf4\u660e|\u63a5\u5165\u8bf4\u660e|\u5065\u5eb7\u68c0\u67e5\u8bf4\u660e|\u5f00\u53d1\u6307\u5357|\u5b89\u88c5\u8bf4\u660e|\u914d\u7f6e\u8bf4\u660e|\u6559\u7a0b|\u624b\u518c|\u6307\u5357|\u516c\u5f00\s*API|public\s*api|\u914d\u7f6e\u65b9\u5f0f|\u542f\u52a8\u547d\u4ee4|\u90e8\u7f72\u6b65\u9aa4|\u8fc1\u79fb\u8bf4\u660e|\u7528\u6237\u53ef\u89c1)/i.test(inputText);
}

function isDocsOnlyRequest(inputText) {
  if (!needsDocsAgent(inputText)) return false;
  const text = String(inputText ?? "");
  const positiveCodeSignals = /(\u524d\u7aef|\u540e\u7aef|\u6570\u636e\u5e93|\u63a5\u53e3|API|\u6e90\u7801|\u4ee3\u7801|\u4e1a\u52a1\u4ee3\u7801|\u9875\u9762|\u7ec4\u4ef6|\u670d\u52a1|\u8def\u7531|\u8fc1\u79fb|\u6d4b\u8bd5|\u767b\u5f55|\u6743\u9650|\u90e8\u7f72|\u53d1\u5e03|\u56de\u5f52|\u6027\u80fd)/i;
  const negatedCodeSignals = /(\u4e0d\u8981|\u4e0d\u7528|\u65e0\u987b|\u65e0\u9700|\u4e0d\u6539|\u522b\u6539|\u4e0d\u8981\u4fee\u6539|\u4e0d\u8981\u52a8|\u4e0d\u8981\u6d89\u53ca).{0,8}(\u524d\u7aef|\u540e\u7aef|\u6570\u636e\u5e93|\u63a5\u53e3|API|\u6e90\u7801|\u4ee3\u7801|\u4e1a\u52a1\u4ee3\u7801|\u9875\u9762|\u7ec4\u4ef6|\u670d\u52a1|\u8def\u7531|\u8fc1\u79fb|\u6d4b\u8bd5|\u767b\u5f55|\u6743\u9650|\u90e8\u7f72|\u53d1\u5e03|\u56de\u5f52|\u6027\u80fd)/i;
  if (!positiveCodeSignals.test(text)) return true;
  return negatedCodeSignals.test(text);
}

function hasImpact(inputText, flag) {
  const flagScope = scopeForFlag(flag);
  if (flagScope && isScopeNegated(inputText, flagScope)) return false;
  const effectiveText = stripNegatedScopeText(inputText);
  const checked = new RegExp(`- \\[[xX]\\]\\s+${escapeRegExp(flag)}\\b`);
  const mentioned = new RegExp(`\\b${escapeRegExp(flag)}\\b`, "i");
  if (checked.test(inputText)) return true;
  if (mentioned.test(effectiveText)) return true;
  const aliases = {
    web: [
      /C\s*\u7aef/i,
      /c\s*\u7aef/i,
      /\u524d\u7aef|\u9875\u9762|\u7f51\u9875|\u7f51\u7ad9|\u7ad9\u70b9|\u9996\u9875|\u76f8\u518c|\u7167\u7247\u5899|\u7011\u5e03\u6d41|\u5e03\u5c40|\u6837\u5f0f|\u6587\u6848|\u4e2d\u6587\u5316|\u5bfc\u822a|\u7a7a\u6001|\u9519\u8bef\u6001|\u79fb\u52a8\u7aef|\u54cd\u5e94\u5f0f/
    ],
    frontend: [
      /C\s*\u7aef/i,
      /c\s*\u7aef/i,
      /\u524d\u7aef|\u9875\u9762|\u7f51\u9875|\u7f51\u7ad9|\u7ad9\u70b9|\u9996\u9875|\u76f8\u518c|\u7167\u7247\u5899|\u7011\u5e03\u6d41|\u5e03\u5c40|\u6837\u5f0f|\u6587\u6848|\u4e2d\u6587\u5316|\u5bfc\u822a|\u7a7a\u6001|\u9519\u8bef\u6001|\u79fb\u52a8\u7aef|\u54cd\u5e94\u5f0f/
    ],
    docs: [/\u6587\u6863|\u8bf4\u660e|README|readme|docs?|markdown|\.md|\u4f7f\u7528\u8bf4\u660e|\u63a5\u5165\u8bf4\u660e|\u5f00\u53d1\u6307\u5357|\u5b89\u88c5\u8bf4\u660e|\u914d\u7f6e\u8bf4\u660e|\u6559\u7a0b|\u624b\u518c|\u6307\u5357/i],
    admin: [/\u540e\u53f0|\u7ba1\u7406\u7aef|\u7ba1\u7406\u540e\u53f0|\u8fd0\u8425\u540e\u53f0|admin/i],
    api: [/\u63a5\u53e3|\u540e\u7aef|\u670d\u52a1\u7aef|API/i],
    backend: [/\u63a5\u53e3|\u540e\u7aef|\u670d\u52a1\u7aef|API/i],
    db: [/\u6570\u636e\u5e93|\u6570\u636e\u8868|\u8fc1\u79fb|schema|\u7d22\u5f15/i],
    database: [/\u6570\u636e\u5e93|\u6570\u636e\u8868|\u8fc1\u79fb|schema|\u7d22\u5f15/i],
    infra: [/\u90e8\u7f72|CI|CD|Docker|\u73af\u5883\u53d8\u91cf|\u6d41\u6c34\u7ebf/i],
    devops: [/\u90e8\u7f72|CI|CD|Docker|\u73af\u5883\u53d8\u91cf|\u6d41\u6c34\u7ebf/i]
  };
  return hasPositiveMatch(inputText, aliases[flag] ?? [], { scope: flagScope });
}

function buildAgentTask(agentId, agent, inputText, profile, impactScopes) {
  const model = resolveModel(agentId, agent);
  const allowed = allowedPathsFor(agentId, impactScopesConfig, impactScopes).map((item) => replaceRun(item));
  const projectRuleFiles = overlayRuleFilesForAgent(projectOverlay, agentId, {
    allowedPatterns: allowed,
    taskText: inputText,
    impactScopes
  });
  const inputs = [
    `.harness/runs/${runId}/input.md`,
    agentId === "requirements-plan" ? `.harness/runs/${runId}/logs/clarifications/answers.json` : null,
    agentId === "requirements-plan" ? `.harness/runs/${runId}/logs/clarifications/answers.md` : null,
    `.harness/runs/${runId}/artifacts/requirement.md`,
    `.harness/runs/${runId}/artifacts/architecture.md`,
    `.harness/runs/${runId}/artifacts/implementation-plan.md`,
    `.harness/runs/${runId}/logs/context/related-runs.md`,
    `.harness/runs/${runId}/logs/context/memory-hints.md`,
    ".harness/AGENTS.md",
    agent.owner,
    ".harness/config/agents.yaml",
    ".harness/project/profile.yaml",
    projectOverlay.exists ? projectOverlay.path : null,
    ".harness/config/model-policy.yaml",
    ".harness/config/document-policy.yaml",
    ...(agent.rule_files ?? []),
    ...projectRuleFiles
  ].filter(Boolean);

  return `# Agent Task: ${agentId}

## Run

- runId: ${runId}
- agent: ${agentId}
- stage: ${agent.default_stage}
- category: ${agent.category}
- impact_scopes: ${impactScopes.length ? impactScopes.join(", ") : "(none)"}

## Recommended Model

- profile: ${model.profile}
- model: ${model.model}
- reasoning_effort: ${model.reasoning_effort}

## Inputs

${inputs.map((item) => `- ${item}`).join("\n")}

## Project Overlay

${overlaySummary(projectOverlay)}

## Response Language

- Human-facing summaries, handoff notes, blockers, and coordination comments should match the user's primary language.
- User primary language for this run: ${workloadAnalysis.primaryLanguage ?? "en"}.
- Keep artifact headings, JSON field names, file paths, commands, and status values in English exactly as required by the schema.

## Responsibility

${(agent.scope ?? []).map((item) => `- ${item}`).join("\n")}

## Allowed Write Scope

${allowed.length ? allowed.map((item) => `- ${item}`).join("\n") : "- none"}

## Forbidden

- unrelated business code
- files owned by other active agents
- long-lived product documentation before release confirmation
- secrets, tokens, production environment files
- asking the main agent to fix tester/reviewer findings directly; use targetAgents and requiredFixes instead

## Required Outputs

${requiredOutputsFor(agentId).map((item) => `- ${item}`).join("\n")}

## Artifact Schema

${artifactSchemaForAgent(agentId)}

## Structured Artifact Payload

${artifactPayloadContractForAgent(agentId)}

## Output Contract

${outputContractFor(agentId)}

## Current Run Input Snapshot

${limitText(inputText.trim(), 2500) || "(empty)"}

## Completion Checklist

- [ ] Read the run input and relevant artifacts.
- [ ] Stayed inside the responsibility and allowed write scope.
- [ ] Recorded tests, or explained why tests could not run.
- [ ] Updated the owned artifact or result summary.
`;
}

function allowedPathsFor(agentId, impactScopeConfig, impactScopes) {
  const paths = [];
  const selectedScopes = new Set(impactScopes);
  for (const [scope, config] of Object.entries(impactScopeConfig ?? {})) {
    if (selectedScopes.size > 0 && !selectedScopes.has(scope)) continue;
    if ((config.agents ?? []).includes(agentId)) {
      paths.push(...(config.write_paths ?? []), ...(config.artifacts ?? []));
    }
  }

  if (paths.length > 0) return [...new Set(paths)];

  const artifactByAgent = {
    pm: [".harness/runs/<run>/logs/native-subagents/pm.result.md", ".harness/runs/<run>/logs/native-subagents/pm.result.json"],
    "requirements-plan": [".harness/runs/<run>/artifacts/requirement-plan.md"],
    requirements: [".harness/runs/<run>/artifacts/requirement.md"],
    architect: [".harness/runs/<run>/artifacts/architecture.md", ".harness/runs/<run>/artifacts/implementation-plan.md"],
    frontend: ["src/**", "package.json", "index.html", "public/**", "vite.config.*"],
    docs: ["README.md", "docs/**", "*.md"],
    backend: ["server/**", "api/**", "src/**", "package.json"],
    database: ["prisma/**", "migrations/**", "db/**", ".harness/runs/<run>/artifacts/db-migration.md"],
    devops: ["Dockerfile", "docker-compose*.yml", ".github/**", "scripts/**", ".harness/runs/<run>/artifacts/release-summary.md"],
    tester: [".harness/runs/<run>/artifacts/test-report.md"],
    reviewer: [".harness/runs/<run>/artifacts/review-report.md"],
    release: [".harness/runs/<run>/artifacts/release-summary.md"]
  };
  return artifactByAgent[agentId] ?? [];
}

function requiredOutputsFor(agentId) {
  const outputs = {
    pm: ["scope notes", "priority/boundary questions"],
    "requirements-plan": ["artifacts/requirement-plan.md"],
    requirements: ["artifacts/requirement.md"],
    architect: ["artifacts/architecture.md", "artifacts/implementation-plan.md"],
    frontend: ["frontend code changes or implementation notes", "verification notes"],
    docs: ["documentation changes", "docs/README update notes", "verification notes", "docs validation report"],
    backend: ["backend code changes or API notes", "artifacts/api-change.md"],
    database: ["migration/schema notes", "artifacts/db-migration.md"],
    devops: ["deployment/CI notes", "rollback notes"],
    tester: ["artifacts/test-report.md"],
    reviewer: ["artifacts/review-report.md"],
    release: ["artifacts/release-summary.md"]
  };
  return outputs[agentId] ?? ["task result summary"];
}

function artifactSchemaForAgent(agentId) {
  const outputs = requiredOutputsFor(agentId)
    .map((item) => item.replace(/^artifacts\//, ""))
    .filter((item) => item.endsWith(".md"));
  const lines = [];
  for (const output of outputs) {
    const schema = artifactSchema[output];
    if (!schema) continue;
    lines.push(`### ${output}`);
    if (schema.owner) lines.push(`- owner: ${schema.owner}`);
    if (schema.required_headings?.length) {
      lines.push("- required_headings:");
      lines.push(...schema.required_headings.map((heading) => `  - ${heading}`));
    }
    if (schema.forbidden_terms?.length) {
      lines.push("- forbidden_terms:");
      lines.push(...schema.forbidden_terms.map((term) => `  - ${term}`));
    }
    lines.push("");
  }
  return lines.length
    ? lines.join("\n").trim()
    : "- No dedicated artifact schema for this agent.";
}

function artifactPayloadContractForAgent(agentId) {
  const outputs = requiredOutputsFor(agentId)
    .map((item) => item.replace(/^artifacts\//, ""))
    .filter((item) => item.endsWith(".md"));
  const payloads = {};
  for (const output of outputs) {
    const schema = artifactSchema[output];
    if (!schema?.required_headings?.length) continue;
    payloads[`artifacts/${output}`] = {
      title: artifactTitle(output),
      sections: Object.fromEntries(schema.required_headings.map((heading) => [heading, "Write this section content here. Use 'none' only when the section is intentionally empty."]))
    };
  }
  if (Object.keys(payloads).length === 0) return "- This agent does not own a schema-rendered artifact.";
  return [
    "For every owned artifact you update, put structured content in your `<agent>.result.json` under `artifactPayloads`.",
    "Do not hand-author Markdown headings. Harness renders Markdown from this JSON and the artifact schema.",
    "",
    "### JSON Schema",
    "",
    "```json",
    JSON.stringify(artifactPayloadJsonSchema(payloads), null, 2),
    "```",
    "",
    "```json",
    JSON.stringify({ artifactPayloads: payloads }, null, 2),
    "```"
  ].join("\n");
}

function artifactPayloadJsonSchema(payloads) {
  const payloadProperties = {};
  const requiredPayloads = [];
  for (const [artifactPath, payload] of Object.entries(payloads)) {
    requiredPayloads.push(artifactPath);
    payloadProperties[artifactPath] = {
      type: "object",
      required: ["title", "sections"],
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1 },
        sections: {
          type: "object",
          required: Object.keys(payload.sections),
          additionalProperties: true,
          properties: Object.fromEntries(Object.keys(payload.sections).map((heading) => [
            heading,
            {
              anyOf: [
                { type: "string", minLength: 1 },
                { type: "array", minItems: 1 },
                { type: "object" }
              ]
            }
          ]))
        }
      }
    };
  }
  return {
    type: "object",
    required: ["artifactPayloads"],
    additionalProperties: true,
    properties: {
      artifactPayloads: {
        type: "object",
        required: requiredPayloads,
        additionalProperties: false,
        properties: payloadProperties
      }
    }
  };
}

function artifactTitle(fileName) {
  return fileName
    .replace(/\.md$/, "")
    .split("-")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function outputContractFor(agentId) {
  const common = [
    "- Write the owned result files yourself:",
    `  - .harness/runs/${runId}/logs/native-subagents/${agentId}.result.md`,
    `  - .harness/runs/${runId}/logs/native-subagents/${agentId}.result.json`,
    "- If you update any owned Markdown artifact, include `artifactPayloads` in result JSON. Harness renders the Markdown from this structured payload.",
    "- JSON must use `artifactUpdates` and `artifactsUpdated`; do not use `artifacts` as a substitute.",
    "- Every updated artifact listed in JSON must be owned by this agent and have a matching `artifactPayloads` entry when it is a Markdown artifact."
  ];

  const byAgent = {
    "requirements-plan": [
      "- `requirement-plan.md` must use the exact headings from Artifact Schema.",
      "- The `Clarification Card` section must be the first user-facing review surface and use compact Markdown tables/bullets.",
      "- The clarification card must start with an obvious `ACTION REQUIRED: 需要用户回答` section that says the run is paused until the user answers.",
      "- Include a copyable reply format such as `Q-01:B; Q-02:A` in the card.",
      "- The card must include `Confirmed Facts`, `Decisions Needed`, `Non-Goals Snapshot`, `Acceptance Preview`, and `Ready To Continue` subsections.",
      "- Write all user-facing card content, question text, option labels, option descriptions, summaries, blockers, and handoff notes in the user's primary language.",
      "- Keep required headings, JSON field names, status values, file paths, and commands in English.",
      "- Expand the request into goals, non-goals, boundary decisions, acceptance criteria draft, and impact scope candidates.",
      "- First pass must return `needs_input` with `clarificationQuestions` unless prior user answers and `userConfirmed: true` are already present.",
      "- If required decisions are missing, return `needs_input` and fill `clarificationQuestions` in the result JSON.",
      "- Do not answer your own clarification questions or silently choose defaults for the user.",
      "- Return at most 3 clarification questions per round; prefer a second round over a long questionnaire.",
      "- Prefer `single_choice` or `multi_choice` questions with concise lettered options when the decision space is clear.",
      "- Use option ids such as `A`, `B`, `C`, `D`, `E`; keep the last option as `其它` / `Other` unless the choice is intentionally exhaustive.",
      "- Keep question labels and descriptions concise enough for CLI or native choice UI.",
      "- `Acceptance Criteria Draft` must contain numbered entries such as `AC-01`, `AC-02`."
    ],
    requirements: [
      "- `requirement.md` must use the exact headings from Artifact Schema.",
      "- `Acceptance Criteria` must contain concrete numbered entries such as `AC-01`, `AC-02`.",
      "- Each acceptance criterion must be testable by tester."
    ],
    architect: [
      "- `architecture.md` and `implementation-plan.md` must use the exact headings from Artifact Schema.",
      "- Do not leave placeholder text such as TBD, TODO, waiting for another agent, or template placeholder.",
      "- The implementation plan must map files/modules to implementation agents and use exact agent ids such as `frontend`, `backend`, `database`, `devops`, and `docs` when assigning work."
    ],
    tester: [
      "- `test-report.md` must use the exact headings from Artifact Schema.",
      "- Reference `AC-*` IDs from `requirement.md` whenever they exist.",
      "- For frontend/local MVP work, verify non-blank page, add, persistence after refresh, complete, complete-state persistence after refresh, delete, delete-after-refresh, empty input rejection, desktop viewport, mobile viewport, build command, and service shutdown.",
      "- If any required check fails, set `fixRequired: true`, fill `targetAgents`, and put precise `requiredFixes` entries in result JSON."
    ],
    reviewer: [
      "- `review-report.md` must use the exact headings from Artifact Schema.",
      "- Under `Conclusion`, use exactly one checkbox line: `- [x] pass`, `- [x] conditional pass`, or `- [x] fail`.",
      "- Under `Blocking Issues`, write `- none` when there are no blocking issues.",
      "- If fixes are required, set `fixRequired: true`, fill `targetAgents`, and put precise `requiredFixes` entries in result JSON."
    ],
    release: [
      "- `release-summary.md` must use the exact headings from Artifact Schema.",
      "- Include verification status, known risks, user-facing run/build command, and rollback strategy."
    ]
  };

  return [...common, ...(byAgent[agentId] ?? [])].join("\n");
}

function resolveModel(agentId, agent) {
  const profileName = modelPolicy.agent_model_policy?.[agentId]?.profile
    ?? agent.model_profile
    ?? "standard_analysis";
  const profile = modelPolicy.model_profiles?.[profileName] ?? {};
  return {
    profile: profileName,
    model: profile.codex_model_hint ?? profile.model ?? "gpt-5.4",
    reasoning_effort: profile.reasoning_effort ?? "medium"
  };
}

function buildMainSummary(selectedAgents, workflowProfile, impactScopes) {
  const main = resolveModel("main", { model_profile: "low_cost" });
  return `# Main Agent Summary

## Run

- runId: ${runId}
- workflow_profile: ${workflowProfile}
- run_type: ${workloadAnalysis.runType}
- primary_language: ${workloadAnalysis.primaryLanguage ?? "en"}
- impact_scopes: ${impactScopes.length ? impactScopes.join(", ") : "(none)"}

## Main Agent Model

- profile: ${main.profile}
- model: ${main.model}
- reasoning_effort: ${main.reasoning_effort}

## Generated Tasks

${selectedAgents.map((agent) => `- tasks/${agent}.task.md`).join("\n")}

## Execution Rules

- Use crewup run to create or select a run; do not route default work through backlog.
- Keep the strict harness flow when the user explicitly requests CrewUp/full-loop workflow.
- Use native subagents when lifecycle tools are available.
- Formal artifacts must be written by their owner agents, not by the main agent.
- Product documentation sync is allowed only after release and explicit approval.
- discovery/plan_only runs allow planning and review only; no business code changes.
- When tester/reviewer feedback requires code changes, the main agent only delegates repairs to owner agents.
- Keep only concise subagent summaries, blockers, and next steps in the main window.
`;
}

function replaceRun(inputPath) {
  return inputPath.replaceAll("<run>", runId);
}

function detectImpactScopes(inputText, impactScopeConfig, overlayProfile) {
  const scopes = new Set();
  for (const scope of Object.keys(impactScopeConfig ?? {})) {
    if (hasExplicitScopeSignal(inputText, scope)) scopes.add(scope);
  }

  for (const match of inferOverlayScopeMatches(overlayProfile, { taskText: inputText })) {
    if (isScopeNegated(inputText, scopeForFlag(match.scope) ?? match.scope)) continue;
    if (impactScopeConfig?.[match.scope] && match.confidence !== "low") scopes.add(match.scope);
  }
  return [...scopes];
}

function hasExplicitScopeSignal(inputText, scope) {
  if (isScopeNegated(inputText, scopeForFlag(scope) ?? scope)) return false;
  const effectiveText = stripNegatedScopeText(inputText);
  const checked = new RegExp(`- \\[[xX]\\]\\s+${escapeRegExp(scope)}\\b`);
  if (checked.test(inputText)) return true;
  if (new Set(["ui"]).has(scope)) return false;
  return new RegExp(`\\b${escapeRegExp(scope)}\\b`, "i").test(effectiveText);
}

function shouldUsePm(workloadAnalysis) {
  const signals = workloadAnalysis.signals ?? {};
  return Boolean(signals.highRisk || signals.ambiguous || signals.discovery || (signals.deepPlanning && !signals.lite));
}

function removeNegatedAgents(selected, inputText) {
  const negated = new Set(negatedScopes(inputText));
  const byScope = {
    backend: "backend",
    database: "database",
    devops: "devops"
  };
  for (const [scope, agent] of Object.entries(byScope)) {
    if (negated.has(scope)) selected.delete(agent);
  }
}

function scopeForFlag(flag) {
  const map = {
    api: "backend",
    backend: "backend",
    db: "database",
    database: "database",
    infra: "devops",
    devops: "devops"
  };
  return map[flag] ?? "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function limitText(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n...(truncated)` : text;
}

async function updateRunState({ workflowProfile, workloadAnalysis }) {
  const statePath = path.join(runDir, "state.json");
  if (!existsSync(statePath)) return;
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const now = new Date().toISOString();
  state.workflowProfile = workflowProfile;
  state.runType = workloadAnalysis.runType;
  state.workloadAnalysis = {
    complexityScore: workloadAnalysis.complexityScore,
    complexityLevel: workloadAnalysis.complexityLevel,
    inferredProfile: workloadAnalysis.inferredProfile,
    runType: workloadAnalysis.runType,
    needsRequirementsPlan: workloadAnalysis.needsRequirementsPlan,
    updatedAt: now
  };

  if (isDocsOnlyRun(selectedAgents)) {
    state.confirmations = state.confirmations ?? {};
    state.confirmations.implementation_approved_at = state.confirmations.implementation_approved_at ?? now;
  }

  if (
    state.stage === "requirements_plan"
    && workloadAnalysis.needsRequirementsPlan === false
    && workflowProfile === "lite"
  ) {
    state.stage = "implement";
    state.owners = selectedAgents;
    state.transitions = [
      ...(state.transitions ?? []),
      {
        from: "requirements_plan",
        to: "implement",
        at: now,
        reason: "lite_run_skips_requirements_plan"
      }
    ];
  }

  if (workflowProfile === "lite-v2") {
    state.stage = "implement";
    state.owners = ["main"];
    state.confirmations = state.confirmations ?? {};
    state.confirmations.implementation_approved_at = state.confirmations.implementation_approved_at ?? now;
    state.nextAction = {
      type: "lite-v2",
      description: "Implement the scoped change directly, then record validation and summary.",
      command: `npx crewup finish ${runId}`
    };
    const lastTransition = state.transitions?.at(-1);
    if (lastTransition?.reason !== "lite_v2_prepared") {
      state.transitions = [
        ...(state.transitions ?? []),
        {
          from: lastTransition?.to ?? "requirements_plan",
          to: "implement",
          at: now,
          reason: "lite_v2_prepared"
        }
      ];
    }
  }

  state.updatedAt = now;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function isDocsOnlyRun(agentList) {
  return isDocsOnlyAgentSet(agentList);
}

async function writeLiteV2Artifacts({ input: inputText, impactScopes }) {
  const now = new Date().toISOString();
  await writeFile(path.join(runDir, "spec.md"), renderLiteSpec({ inputText, impactScopes, now }), "utf8");
  await writeFile(path.join(runDir, "tasks.md"), renderLiteTasks({ impactScopes, now }), "utf8");
  await writeFile(path.join(runDir, "validation.md"), renderLiteValidation({ now }), "utf8");
  await writeFile(path.join(runDir, "summary.md"), renderLiteSummary({ now }), "utf8");
}

async function writePlanArtifacts({ input: inputText, impactScopes }) {
  const now = new Date().toISOString();
  await writeFile(path.join(runDir, "planning.md"), renderPlanRootArtifact({ inputText, impactScopes, now }), "utf8");
  await writeFile(path.join(runDir, "acceptance.md"), renderPendingRootArtifact("Acceptance", now, "plan"), "utf8");
  await writeFile(path.join(runDir, "architecture-plan.md"), renderPendingRootArtifact("Architecture Plan", now, "plan"), "utf8");
  await writeFile(path.join(runDir, "implementation-plan.md"), renderPendingRootArtifact("Implementation Plan", now, "plan"), "utf8");
  await writeFile(path.join(runDir, "review.md"), renderPendingRootArtifact("Review", now, "plan"), "utf8");
  await writeFile(path.join(runDir, "validation.md"), renderNoCodeValidation({ now, profile: "plan" }), "utf8");
  await writeFile(path.join(runDir, "summary.md"), renderPendingRootArtifact("Summary", now, "plan"), "utf8");
}

async function writeDiscoveryArtifacts({ input: inputText, impactScopes }) {
  const now = new Date().toISOString();
  await writeFile(path.join(runDir, "discovery.md"), renderDiscoveryRootArtifact({ inputText, impactScopes, now }), "utf8");
  await writeFile(path.join(runDir, "module-map.md"), renderPendingRootArtifact("Module Map", now, "discovery"), "utf8");
  await writeFile(path.join(runDir, "tech-map.md"), renderPendingRootArtifact("Tech Map", now, "discovery"), "utf8");
  await writeFile(path.join(runDir, "risk-map.md"), renderPendingRootArtifact("Risk Map", now, "discovery"), "utf8");
  await writeFile(path.join(runDir, "next-runs.md"), renderPendingRootArtifact("Next Runs", now, "discovery"), "utf8");
  await writeFile(path.join(runDir, "review.md"), renderPendingRootArtifact("Review", now, "discovery"), "utf8");
  await writeFile(path.join(runDir, "summary.md"), renderPendingRootArtifact("Summary", now, "discovery"), "utf8");
}

function renderPlanRootArtifact({ inputText, impactScopes, now }) {
  return renderGeneratedMarkdown({
    title: "Planning",
    file: "planning.md",
    schema: generatedMarkdownSchema,
    sections: {
      Goal: [`- ${oneLine(inputText) || "Create a no-code plan."}`],
      Scope: [
        `- Impact scopes: ${impactScopes.length ? impactScopes.join(", ") : "(not detected)"}`,
        "- This is a no-code CrewUp plan run."
      ],
      "Required Outputs": [
        "- planning.md",
        "- acceptance.md",
        "- architecture-plan.md",
        "- implementation-plan.md",
        "- review.md",
        "- validation.md",
        "- summary.md"
      ],
      Metadata: [`- generatedAt: ${now}`, "- profile: plan"]
    }
  });
}

function renderDiscoveryRootArtifact({ inputText, impactScopes, now }) {
  return renderGeneratedMarkdown({
    title: "Discovery",
    file: "discovery.md",
    schema: generatedMarkdownSchema,
    sections: {
      Goal: [`- ${oneLine(inputText) || "Discover project structure and module boundaries."}`],
      Scope: [
        `- Impact scopes: ${impactScopes.length ? impactScopes.join(", ") : "(not detected)"}`,
        "- This is a no-code CrewUp discovery run."
      ],
      "Required Outputs": [
        "- discovery.md",
        "- module-map.md",
        "- tech-map.md",
        "- risk-map.md",
        "- next-runs.md",
        "- review.md",
        "- summary.md"
      ],
      Metadata: [`- generatedAt: ${now}`, "- profile: discovery"]
    }
  });
}

function renderPendingRootArtifact(title, now, profile) {
  if (title === "Summary") {
    return renderGeneratedMarkdown({
      title,
      file: "summary.md",
      schema: generatedMarkdownSchema,
      sections: {
        Outcome: "- pending",
        "Changed Files": profile === "plan" || profile === "discovery" ? "- none; no-code mode" : "- pending",
        Validation: "- pending",
        "Residual Risks": "- pending",
        Metadata: [`- generatedAt: ${now}`, `- profile: ${profile}`]
      }
    });
  }

  return renderGeneratedMarkdown({
    title,
    file: `${title.toLowerCase().replaceAll(" ", "-")}.md`,
    schema: generatedMarkdownSchema,
    sections: {
      Status: "- pending",
      Notes: `- This file is part of the fixed ${profile} run structure.`,
      Metadata: [`- generatedAt: ${now}`, `- profile: ${profile}`]
    }
  });
}

function renderNoCodeValidation({ now, profile }) {
  return renderGeneratedMarkdown({
    title: "Validation",
    file: "validation.md",
    schema: generatedMarkdownSchema,
    sections: {
      Result: "- status: pending",
      Commands: "- no-code validation pending",
      "Acceptance Criteria Check": "- [ ] No business code changes were made.",
      "Risks Or Skips": "- pending",
      Metadata: [`- generatedAt: ${now}`, `- profile: ${profile}`]
    }
  });
}

function renderLiteSpec({ inputText, impactScopes, now }) {
  return renderGeneratedMarkdown({
    title: "Lite Spec",
    file: "spec.md",
    schema: generatedMarkdownSchema,
    sections: {
      Goal: `- ${oneLine(inputText) || "Complete the requested lightweight change."}`,
      Scope: [
        `- Impact scopes: ${impactScopes.length ? impactScopes.join(", ") : "(not detected; keep changes minimal and task-scoped)"}`,
        "- Use this lite-v2 run only for low-risk, scoped implementation work."
      ],
      "Non-Goals": [
        "- Do not make unrelated refactors.",
        "- Do not change database, authentication, deployment, or production-risk behavior unless the user explicitly asked to leave lite-v2.",
        "- Do not claim strict CrewUp audit provenance for this run."
      ],
      "Acceptance Criteria": [
        "- [ ] AC-01: The requested scoped change is implemented.",
        "- [ ] AC-02: Relevant validation is discovered from project evidence and recorded in `validation.md`.",
        "- [ ] AC-03: Residual risks or skipped checks are documented."
      ],
      Risks: "- Lite-v2 is an opt-in lightweight path and does not require native subagent provenance.",
      Metadata: [`- generatedAt: ${now}`, "- profile: lite-v2"]
    }
  });
}

function renderLiteTasks({ impactScopes, now }) {
  return renderGeneratedMarkdown({
    title: "Lite Tasks",
    file: "tasks.md",
    schema: generatedMarkdownSchema,
    sections: {
      Plan: [
        "- [ ] Review `input.md` and `spec.md`.",
        "- [ ] Implement only the scoped change.",
        "- [ ] Discover relevant validation from project evidence such as package manifests, README, CI config, framework config, and existing tests.",
        "- [ ] Run relevant build, test, lint, typecheck, smoke, browser, API, or preview checks when available.",
        "- [ ] Update `validation.md` with command results.",
        "- [ ] Update `summary.md` with outcome, changed files, validation, and risks."
      ],
      "Allowed Scope": [
        `- Impact scopes: ${impactScopes.length ? impactScopes.join(", ") : "(not detected)"}`,
        "- Keep changes inside the user's request and discovered project scope."
      ],
      "Validation Discovery": "- Record project evidence reviewed and exact commands/checks before or after running them.",
      Metadata: [`- generatedAt: ${now}`, "- profile: lite-v2"]
    }
  });
}

function renderLiteValidation({ now }) {
  return renderGeneratedMarkdown({
    title: "Lite Validation",
    file: "validation.md",
    schema: generatedMarkdownSchema,
    sections: {
      Result: "- status: pending",
      Commands: [
        "| Command | Result | Notes |",
        "| --- | --- | --- |",
        "| pending | pending | Discover project validation, then add command/check results here. |"
      ],
      "Acceptance Criteria Check": [
        "- [ ] AC-01: pending",
        "- [ ] AC-02: pending",
        "- [ ] AC-03: pending"
      ],
      "Risks Or Skips": "- none",
      Metadata: [`- generatedAt: ${now}`, "- profile: lite-v2"]
    }
  });
}

function renderLiteSummary({ now }) {
  return renderGeneratedMarkdown({
    title: "Lite Summary",
    file: "summary.md",
    schema: generatedMarkdownSchema,
    sections: {
      Outcome: "- pending",
      "Changed Files": "- pending",
      Validation: "- pending",
      "Residual Risks": "- none",
      Metadata: [`- generatedAt: ${now}`, "- profile: lite-v2"]
    }
  });
}

function oneLine(value) {
  return String(value ?? "").trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] ?? "";
}


