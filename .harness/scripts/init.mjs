import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createInterface, emitKeypressEvents } from "node:readline";
import { resolveScriptPath } from "./lib/script-root.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const nonInteractive = args.includes("--yes") || args.includes("-y") || args.includes("--no-interactive");
const projectNameArg = valueOf("--name=");
const agentArg = valueOf("--agent=") ?? valueAfter("--agent");

const profilePath = path.join(root, ".harness", "project", "profile.yaml");
const overlayPath = path.join(root, ".harness", "project", "overlay.yaml");
const agentPath = path.join(root, ".harness", "project", "agent.yaml");
const agentAdapterPath = path.join(root, ".harness", "project", "agent-adapter.md");
const inspectPath = path.join(root, ".harness", "project", "inspect.json");
const rulesDir = path.join(root, ".harness", "project", "rules");
const profile = await loadProjectProfileSpec();
const selectedAgent = await resolveAgentSelection();
const overlay = buildOverlay(profile);
const files = [
  { path: profilePath, content: renderProfile(profile) },
  { path: overlayPath, content: renderOverlay(overlay) },
  { path: agentPath, content: renderAgentConfig(selectedAgent) },
  { path: agentAdapterPath, content: renderAgentAdapter(selectedAgent) },
  { path: path.join(rulesDir, "language.md"), content: languageRule() },
  { path: path.join(rulesDir, "testing.md"), content: testingRule(profile) },
  { path: path.join(rulesDir, "domain.md"), content: domainRule(profile) }
];

if (dryRun) {
  console.log(JSON.stringify({
    profile,
    agent: selectedAgent,
    files: files.map((file) => rel(file.path))
  }, null, 2));
  process.exit(0);
}

for (const file of files) {
  await writeGeneratedFile(file.path, file.content);
}

refreshKnowledgeBaseline();

console.log("Harness project adaptation layer initialized:");
console.log(`- ${rel(profilePath)}`);
console.log(`- ${rel(overlayPath)}`);
console.log(`- ${rel(agentPath)}`);
console.log(`- ${rel(agentAdapterPath)}`);
console.log(`- ${rel(rulesDir)}`);
printProfileSummary(profile);
printAgentSummary(selectedAgent);

function refreshKnowledgeBaseline() {
  const result = spawnSync(process.execPath, [resolveScriptPath(root, "knowledge.mjs")], {
    cwd: root,
    encoding: "utf8",
    env: process.env
  });
  if (result.status === 0) return;
  const message = result.stderr?.trim() || result.stdout?.trim() || "unknown error";
  console.warn(`Knowledge baseline refresh skipped: ${message}`);
}

async function detectProjectProfile() {
  const rootPackage = await readJson(path.join(root, "package.json"));
  const targetPackage = isHarnessTemplatePackage(rootPackage) ? null : rootPackage;
  const topDirs = await readTopDirs();
  const packageManager = detectPackageManager(targetPackage);
  const workspaceGlobs = unique([
    ...normalizeWorkspaces(targetPackage?.workspaces),
    ...detectWorkspaceGlobs(topDirs)
  ]);
  const modules = await detectModules(workspaceGlobs, topDirs);
  const languages = detectLanguages(topDirs);
  const commands = detectCommands(rootPackage, packageManager, languages);
  const businessPaths = unique([
    ...modules.map((module) => pathPattern(module.path)),
    ...(topDirs.includes("infra") ? ["infra/**"] : []),
    ...(topDirs.includes(".github") ? [".github/workflows/**"] : [])
  ]);
  const scopes = Object.fromEntries(modules.map((module) => [
    module.id,
    {
      agents: module.agents,
      write_paths: [pathPattern(module.path)],
      artifacts: artifactsForAgents(module.agents)
    }
  ]));

  if (topDirs.includes("infra") || topDirs.includes("deploy") || topDirs.includes(".github")) {
    scopes.infra = {
      agents: ["devops"],
      write_paths: unique([
        ...(topDirs.includes("infra") ? ["infra/**"] : []),
        ...(topDirs.includes("deploy") ? ["deploy/**"] : []),
        ...(topDirs.includes(".github") ? [".github/workflows/**"] : [])
      ]),
      artifacts: [".harness/runs/<run>/artifacts/release-summary.md"]
    };
  }

  return {
    name: projectNameArg ?? targetPackage?.name ?? path.basename(root),
    package_manager: packageManager,
    workspace_globs: workspaceGlobs,
    languages,
    commands,
    modules,
    business_paths: businessPaths.length ? businessPaths : ["src/**"],
    impact_scopes: scopes
  };
}

async function loadProjectProfileSpec() {
  const inspected = await readJson(inspectPath);
  if (inspected?.project_profile) {
    return normalizeProjectProfileSpec(inspected.project_profile);
  }
  return await detectProjectProfile();
}

function normalizeProjectProfileSpec(profile) {
  return {
    ...profile,
    workspace_globs: unique(asArray(profile.workspace_globs ?? profile.workspaces)),
    languages: unique(asArray(profile.languages)),
    commands: profile.commands ?? {},
    modules: Array.isArray(profile.modules) ? profile.modules : [],
    business_paths: unique(asArray(profile.business_paths)),
    impact_scopes: profile.impact_scopes ?? {},
    ai_overlay: {
      profile: ".harness/project/overlay.yaml",
      rules_root: ".harness/project/rules",
      discovery: "auto",
      local_rule_file: null,
      ...(profile.ai_overlay ?? {})
    },
    protected_paths: asArray(profile.protected_paths)
  };
}

async function readTopDirs() {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => ![".git", ".harness", "node_modules", "dist", "build", ".next", "coverage"].includes(name))
    .sort();
}

async function detectModules(workspaceGlobs, topDirs) {
  const dirs = unique([
    ...await expandWorkspaceGlobs(workspaceGlobs),
    ...semanticDirs(topDirs)
  ]).filter((dir) => existsSync(path.join(root, dir)));

  if (topDirs.includes("Assets") && topDirs.includes("ProjectSettings") && !dirs.includes("Assets")) dirs.push("Assets");
  if (dirs.length === 0 && topDirs.includes("src")) dirs.push("src");
  if (dirs.length === 0 && hasRootProjectMarkers()) dirs.push(".");

  const modules = [];
  const used = new Set();
  for (const dir of dirs) {
    const packageJson = await readJson(path.join(root, dir, "package.json"));
    const id = uniqueId(dir === "." ? "root" : scopeId(path.basename(dir)), used);
    used.add(id);
    modules.push({
      id,
      path: dir,
      packageName: packageJson?.name ?? null,
      agents: inferAgents(dir, packageJson),
      keywords: inferKeywords(dir, packageJson)
    });
  }
  return modules.sort((left, right) => left.path.localeCompare(right.path));
}

function semanticDirs(topDirs) {
  const known = [
    "web",
    "admin",
    "backend",
    "api",
    "server",
    "service",
    "frontend",
    "client",
    "shared",
    "common",
    "lib",
    "src",
    "include",
    "Assets",
    "Source",
    "Scripts"
  ];
  return topDirs.filter((dir) => known.includes(dir));
}

function detectWorkspaceGlobs(topDirs) {
  const globs = [];
  for (const base of ["apps", "packages", "services", "libs", "modules", "projects"]) {
    if (topDirs.includes(base)) globs.push(`${base}/*`);
  }
  return globs;
}

async function expandWorkspaceGlobs(globs) {
  const dirs = [];
  for (const glob of globs) {
    const normalized = normalizeRelPath(glob);
    if (!normalized || normalized.includes("**")) continue;
    const star = normalized.indexOf("*");
    if (star === -1) {
      if (existsSync(path.join(root, normalized))) dirs.push(normalized);
      continue;
    }
    const prefix = normalized.slice(0, star).replace(/\/+$/, "");
    const suffix = normalized.slice(star + 1).replace(/^\/+/, "");
    const entries = await readdir(path.join(root, prefix || "."), { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      dirs.push(normalizeRelPath(path.posix.join(prefix, entry.name, suffix)));
    }
  }
  return dirs;
}

function detectLanguages(topDirs) {
  const languages = [];
  if (exactPathExists("package.json")) languages.push("javascript");
  if (["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg"].some(exactPathExists)) languages.push("python");
  if (["CMakeLists.txt", "conanfile.txt", "conanfile.py", "vcpkg.json"].some(exactPathExists)) languages.push("cpp");
  if (hasUnityProject(topDirs)) languages.push("unity");
  if (exactPathExists("global.json")) languages.push("dotnet");
  return languages;
}

function detectPackageManager(rootPackage) {
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (rootPackage && existsSync(path.join(root, "package-lock.json"))) return "npm";
  if (rootPackage) return "npm";
  if (existsSync(path.join(root, "uv.lock"))) return "uv";
  if (existsSync(path.join(root, "poetry.lock"))) return "poetry";
  if (existsSync(path.join(root, "pyproject.toml"))) return "python";
  if (existsSync(path.join(root, "CMakeLists.txt"))) return "cmake";
  if (exactPathExists("ProjectSettings")) return "unity";
  return "manual";
}

function hasUnityProject(topDirs) {
  return topDirs.includes("Assets") && (topDirs.includes("ProjectSettings") || exactPathExists("Packages/manifest.json"));
}

function exactPathExists(relativePath) {
  const parts = normalizeRelPath(relativePath).split("/").filter(Boolean);
  if (parts.length === 0) return false;

  let current = root;
  for (const part of parts) {
    const match = safeReadDir(current).find((entry) => entry.name === part);
    if (!match) return false;
    current = path.join(current, match.name);
  }
  return true;
}

function safeReadDir(target) {
  try {
    return readdirSync(target, { withFileTypes: true });
  } catch {
    return [];
  }
}

function detectCommands(rootPackage, packageManager, languages) {
  const scripts = rootPackage?.scripts ?? {};
  const commands = {};
  if (scripts.build) commands.build = `${packageManager} run build`;
  if (scripts.test) commands.test = `${packageManager} run test`;
  if (scripts.typecheck) commands.typecheck = `${packageManager} run typecheck`;
  if (scripts.lint) commands.lint = `${packageManager} run lint`;
  if (packageManager === "npm") commands.install = "npm install";
  if (packageManager === "pnpm") commands.install = "pnpm install";
  if (packageManager === "yarn") commands.install = "yarn install";
  if (languages.includes("python")) {
    commands.python_test = existsSync(path.join(root, "pyproject.toml")) ? "pytest" : "python -m pytest";
  }
  if (languages.includes("cpp")) {
    commands.cpp_configure = "cmake -S . -B build";
    commands.cpp_build = "cmake --build build";
    commands.cpp_test = "ctest --test-dir build";
  }
  return commands;
}

function inferAgents(dir, packageJson) {
  const lowered = dir.toLowerCase();
  const deps = dependencyNames(packageJson).map((name) => name.toLowerCase());
  const has = (name) => deps.includes(name);
  if (lowered.includes("admin") || lowered.includes("web") || lowered.includes("frontend") || has("react") || has("next") || has("vue") || has("vite")) return ["frontend"];
  if (lowered.includes("api") || lowered.includes("backend") || lowered.includes("server") || has("express") || has("@nestjs/common") || has("fastify")) return ["backend"];
  if (lowered.includes("infra") || lowered.includes("deploy")) return ["devops"];
  if (lowered.includes("assets") || lowered.includes("unity")) return ["frontend"];
  if (lowered.includes("shared") || lowered.includes("common") || lowered.includes("types") || lowered.includes("sdk")) return ["backend", "frontend"];
  return ["frontend"];
}

function inferKeywords(dir, packageJson) {
  return unique([
    dir,
    path.basename(dir),
    packageJson?.name,
    packageJson?.name?.split("/").pop()
  ].filter(Boolean));
}

function hasRootProjectMarkers() {
  return [
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "setup.cfg",
    "CMakeLists.txt",
    "conanfile.txt",
    "conanfile.py",
    "vcpkg.json",
    "global.json",
    "ProjectSettings"
  ].some(exactPathExists);
}

function isHarnessTemplatePackage(packageJson) {
  return packageJson?.name === "crewup-harness";
}

function pathPattern(relPath) {
  const normalized = normalizeRelPath(relPath);
  return !normalized || normalized === "." ? "**" : `${normalized}/**`;
}

function buildOverlay(profile) {
  return {
    name: profile.name,
    scopes: profile.modules
  };
}

async function resolveAgentSelection() {
  const candidates = getAgentCandidates();
  if (agentArg) {
    if (agentArg === "generic") {
      throw new Error("Agent `generic` was renamed to `manual`. Use `--agent manual`.");
    }
    const selected = candidates.find((item) => item.id === agentArg);
    if (selected) return selected;
    throw new Error(`Unknown agent: ${agentArg}. Expected one of: ${candidates.map((item) => item.id).join(", ")}`);
  }
  if (shouldUseDefaultAgent()) {
    console.log("No agent selected; using default agent: Codex (codex).");
    console.log("Use `crewup init --agent <codex|claude|cursor|trae|manual>` to choose explicitly.");
    return candidates[0];
  }
  return await promptForAgent(candidates);
}

function shouldUseDefaultAgent() {
  if (nonInteractive) return true;
  if (process.env.CI || process.env.CREWUP_NON_INTERACTIVE === "1") return true;
  return false;
}

function getAgentCandidates() {
  return [
    {
      id: "codex",
      label: "Codex",
      support_level: "native",
      mode: "native",
      description: "OpenAI Codex-style native or CLI-backed workflow",
      capabilities: {
        subagents: true,
        parallel_subagents: true,
        command_execution: true,
        file_editing: true,
        structured_results: true,
        state_writeback: true
      }
    },
    {
      id: "claude",
      label: "Claude Code",
      support_level: "experimental",
      mode: "bridge",
      description: "Claude Code-style workflow bridge",
      capabilities: {
        subagents: false,
        parallel_subagents: false,
        command_execution: "tool-dependent",
        file_editing: "tool-dependent",
        structured_results: "adapter-required",
        state_writeback: "adapter-required"
      }
    },
    {
      id: "cursor",
      label: "Cursor",
      support_level: "experimental",
      mode: "bridge",
      description: "Cursor-style project workflow bridge",
      capabilities: {
        subagents: false,
        parallel_subagents: false,
        command_execution: "tool-dependent",
        file_editing: "tool-dependent",
        structured_results: "adapter-required",
        state_writeback: "adapter-required"
      }
    },
    {
      id: "trae",
      label: "Trae",
      support_level: "experimental",
      mode: "bridge",
      description: "Trae-style project workflow bridge",
      capabilities: {
        subagents: false,
        parallel_subagents: false,
        command_execution: "tool-dependent",
        file_editing: "tool-dependent",
        structured_results: "adapter-required",
        state_writeback: "adapter-required"
      }
    },
    {
      id: "manual",
      label: "Manual",
      support_level: "fallback",
      mode: "manual",
      description: "Manual prompt handoff and shell-only fallback",
      capabilities: {
        subagents: false,
        parallel_subagents: false,
        command_execution: "human-run",
        file_editing: "human-run",
        structured_results: "manual-writeback",
        state_writeback: "manual-writeback"
      }
    }
  ];
}

async function promptForAgent(candidates) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    return await promptForAgentLine(candidates);
  }

  emitKeypressEvents(process.stdin);
  let selectedIndex = 0;
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return await new Promise((resolve) => {
    const render = () => {
      process.stdout.write("\x1Bc");
      console.log("Select the agent environment to generate for:");
      console.log("");
      candidates.forEach((item, index) => {
        const marker = index === selectedIndex ? ">" : " ";
        console.log(`${marker} ${item.label} (${item.id}, ${item.support_level})`);
        console.log(`  ${item.description}`);
      });
      console.log("");
      console.log("Use Up/Down and Enter. Press 1-" + candidates.length + " for quick selection. Press Ctrl+C to cancel.");
    };

    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onKeypress = (_input, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(130);
      }
      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + candidates.length) % candidates.length;
        render();
        return;
      }
      if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % candidates.length;
        render();
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        console.log("");
        resolve(candidates[selectedIndex]);
        return;
      }
      const quickIndex = Number.parseInt(_input, 10);
      if (Number.isInteger(quickIndex) && quickIndex >= 1 && quickIndex <= candidates.length) {
        cleanup();
        console.log("");
        resolve(candidates[quickIndex - 1]);
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}

async function promptForAgentLine(candidates) {
  printAgentChoices(candidates);
  const input = await readLine("Select agent [1]: ");
  const value = input.trim().toLowerCase();
  if (!value) return candidates[0];

  const numeric = Number.parseInt(value, 10);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= candidates.length) return candidates[numeric - 1];

  const selected = candidates.find((item) => item.id === value);
  if (selected) return selected;

  throw new Error(`Unknown agent selection: ${input}. Expected 1-${candidates.length} or one of: ${candidates.map((item) => item.id).join(", ")}`);
}

function printAgentChoices(candidates) {
  console.log("Select the agent environment to generate for:");
  console.log("");
  candidates.forEach((item, index) => {
    console.log(`${index + 1}. ${item.label} (${item.id}, ${item.support_level})`);
    console.log(`   ${item.description}`);
  });
  console.log("");
}

async function readLine(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdout.isTTY)
  });
  try {
    return await new Promise((resolve) => rl.question(question, resolve));
  } finally {
    rl.close();
  }
}

function renderProfile(profile) {
  return `${yaml({
    project_profile: {
      name: profile.name,
      package_manager: profile.package_manager,
      languages: profile.languages,
      workspace_globs: profile.workspace_globs,
      ai_overlay: {
        profile: ".harness/project/overlay.yaml",
        rules_root: ".harness/project/rules",
        discovery: "auto",
        local_rule_file: null
      },
      agent_environment: selectedAgent.id,
      agent_mode: selectedAgent.mode,
      commands: profile.commands,
      business_paths: profile.business_paths,
      protected_paths: [
        ".harness/**",
        ".git/**",
        "node_modules/**",
        ".env",
        ".env.*"
      ],
      impact_scopes: profile.impact_scopes,
      default_agents: {
        planning: ["requirements", "architect"],
        verification: ["tester", "reviewer", "release"]
      }
    }
  })}\n`;
}

function renderAgentConfig(agent) {
  return `${yaml({
    agent_environment: {
      id: agent.id,
      label: agent.label,
      description: agent.description,
      support_level: agent.support_level,
      mode: agent.mode,
      capabilities: agent.capabilities
    }
  })}\n`;
}

function renderAgentAdapter(agent) {
  return `# Agent Adapter

- selected_agent: ${agent.id}
- selected_label: ${agent.label}
- support_level: ${agent.support_level}
- mode: ${agent.mode}
- description: ${agent.description}

## Capabilities

${Object.entries(agent.capabilities).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Contract

This adapter layer is generated by harness:init. Shared workflow files stay reusable; product-specific launch, prompt handoff, lifecycle hooks, and result writeback belong here.

If the selected agent cannot launch native subagents, CrewUp must still close the loop through generated tasks, prompt handoff, verification records, and report/state writeback.
`;
}

function renderOverlay(overlay) {
  return `${yaml({
    ai_project: {
      version: "1.0.0",
      name: overlay.name,
      description: "Project-specific AI overlay generated by harness:init.",
      discovery: {
        enabled: true,
        local_rule_file: null
      },
      language: {
        communication: "zh-CN",
        artifacts: "zh-CN",
        summaries: "zh-CN",
        code_comments: "zh-CN",
        allow_english_for: ["code identifiers", "file paths", "API names", "library names", "commands", "error messages"]
      },
      rules: {
        common: [
          ".harness/project/rules/language.md",
          ".harness/project/rules/domain.md"
        ],
        roles: {
          tester: [".harness/project/rules/testing.md"],
          reviewer: [".harness/project/rules/testing.md"]
        },
        scopes: Object.fromEntries(overlay.scopes.map((scope) => [
          scope.id,
          {
            description: `Project scope: ${scope.path}.`,
            agents: scope.agents,
            paths: [pathPattern(scope.path)],
            keywords: scope.keywords
          }
        ]))
      }
    }
  })}\n`;
}

function languageRule() {
  return `# Language Rules

- Default to the user's language unless another language is requested.
- Keep code identifiers, commands, file paths, API names, and library names in their original form.
- Keep outputs concise, concrete, and aligned with the current project structure.`;
}

function testingRule(profile) {
  const commands = Object.entries(profile.commands).map(([name, command]) => `- ${name}: \`${command}\``).join("\n") || "- No project-level test command detected.";
  return `# Testing Rules

## Project Commands

${commands}

## Strategy

- Prefer the smallest verification command that covers the change.
- Record commands, exit codes, and unresolved risks in the run artifacts.
- Do not claim verification passed unless a validation command was actually run.`;
}

function domainRule(profile) {
  const modules = profile.modules.map((module) => `- ${module.id}: ${module.path} (${module.agents.join(", ")})`).join("\n") || "- No modules detected yet.";
  return `# Domain Rules

This file is generated by harness:init and serves as the starting point for project-specific rules. As the project matures, replace generic guidance with real product and domain rules.
## Detected Modules
${modules}
`;
}

function printProfileSummary(profile) {
  const moduleCount = profile.modules.length;
  const languages = profile.languages.length ? profile.languages.join(", ") : "none";
  const scopes = Object.keys(profile.impact_scopes ?? {});
  console.log("");
  console.log("Detection summary:");
  console.log(`- package manager: ${profile.package_manager}`);
  console.log(`- languages: ${languages}`);
  console.log(`- modules: ${moduleCount}`);
  console.log(`- impact scopes: ${scopes.length ? scopes.join(", ") : "none"}`);
  if (moduleCount === 0 || scopes.length === 0 || profile.package_manager === "manual") {
    console.log("");
    console.log("Manual review recommended:");
    console.log("- edit .harness/project/profile.yaml if the detected modules or commands are incomplete");
    console.log("- edit .harness/project/rules/domain.md to add real project rules");
  }
}

function printAgentSummary(agent) {
  console.log("");
  console.log("Agent selection:");
  console.log(`- selected agent: ${agent.label} (${agent.id})`);
  console.log(`- support level: ${agent.support_level}`);
  console.log(`- mode: ${agent.mode}`);
  console.log(`- adapter: .harness/project/agent.yaml`);
  console.log(`- adapter notes: .harness/project/agent-adapter.md`);
}

async function writeGeneratedFile(target, content) {
  if (existsSync(target) && !force) {
    console.log(`Skipped existing file: ${rel(target)} (use --force to overwrite)`);
    return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function readJson(target) {
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch {
    return null;
  }
}

function yaml(value, indent = 0) {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => `${space(indent)}- ${yamlInlineOrBlock(item, indent + 2)}`).join("\n");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return entries.map(([key, child]) => {
      if (isScalar(child) || isEmptyCollection(child)) return `${space(indent)}${key}: ${yaml(child, 0)}`;
      return `${space(indent)}${key}:\n${yaml(child, indent + 2)}`;
    }).join("\n");
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null || value === undefined) return "null";
  return String(value);
}

function yamlInlineOrBlock(value, indent) {
  if (isScalar(value)) return yaml(value, 0);
  if (isEmptyCollection(value)) return yaml(value, 0);
  return `\n${yaml(value, indent)}`;
}

function isScalar(value) {
  return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value);
}

function isEmptyCollection(value) {
  if (Array.isArray(value)) return value.length === 0;
  return Boolean(value && typeof value === "object" && Object.keys(value).length === 0);
}

function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) return workspaces.filter(Boolean);
  if (Array.isArray(workspaces?.packages)) return workspaces.packages.filter(Boolean);
  return [];
}

function dependencyNames(packageJson) {
  if (!packageJson) return [];
  return unique([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {})
  ]);
}

function artifactsForAgents(agents) {
  const artifacts = [];
  if (agents.includes("backend")) artifacts.push(".harness/runs/<run>/artifacts/api-change.md");
  if (agents.includes("database")) artifacts.push(".harness/runs/<run>/artifacts/db-migration.md");
  if (agents.includes("devops")) artifacts.push(".harness/runs/<run>/artifacts/release-summary.md");
  if (agents.includes("frontend") || agents.includes("backend")) artifacts.push(".harness/runs/<run>/artifacts/test-report.md");
  return unique(artifacts);
}

function scopeId(value) {
  return String(value ?? "").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "scope";
}

function uniqueId(base, used) {
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "").trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function space(count) {
  return " ".repeat(count);
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}
