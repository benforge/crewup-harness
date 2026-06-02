import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { z } from "zod";

const root = process.cwd();
const args = process.argv.slice(2);
const useAi = args.includes("--ai") && !args.includes("--no-ai");
const dryRun = args.includes("--dry-run");
const projectNameArg = valueOf("--name=");

const projectDir = path.join(root, ".harness", "project");
const reportDir = path.join(root, ".harness", "reports");
const inspectPath = path.join(projectDir, "inspect.json");
const adapterPlanPath = path.join(projectDir, "adapter-plan.json");
const reportPath = path.join(reportDir, "project-inspection.md");

await mkdir(projectDir, { recursive: true });
await mkdir(reportDir, { recursive: true });
if (useAi) assertAiConfigured();

const inspection = await collectInspection();
const deterministicPlan = buildProjectProfile(inspection);
const plan = normalizePlan(useAi ? await refinePlanWithAi(inspection, deterministicPlan) : deterministicPlan);
const payload = {
  generatedAt: new Date().toISOString(),
  source: plan.source,
  inspection,
  project_profile: plan.project_profile
};

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

await writeFile(inspectPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(adapterPlanPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(reportPath, renderInspectionReport(payload), "utf8");

console.log("Harness 项目画像已生成：");
console.log(`- ${rel(inspectPath)}`);
console.log(`- ${rel(adapterPlanPath)}`);
console.log(`- ${rel(reportPath)}`);
console.log(`- source: ${payload.source}`);

async function collectInspection() {
  const rootPackage = await readJson(path.join(root, "package.json"));
  const targetPackage = isHarnessTemplatePackage(rootPackage) ? null : rootPackage;
  const topDirs = await readTopDirs();
  const topFiles = await readTopFiles();
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
  const git = collectGitEvidence();
  const fileSignals = await collectFileSignals({ topDirs, topFiles });

  return {
    name: projectNameArg ?? targetPackage?.name ?? path.basename(root),
    package_manager: packageManager,
    workspace_globs: workspaceGlobs,
    languages,
    commands,
    modules,
    business_paths: businessPaths.length ? businessPaths : ["src/**"],
    impact_scopes: scopes,
    evidence: {
      topDirs,
      topFiles,
      git,
      fileSignals
    }
  };
}

function buildProjectProfile(inspection) {
  return {
    source: "heuristic",
    project_profile: {
      name: inspection.name,
      package_manager: inspection.package_manager,
      workspace_globs: inspection.workspace_globs,
      languages: inspection.languages,
      commands: inspection.commands,
      modules: inspection.modules,
      business_paths: inspection.business_paths,
      impact_scopes: inspection.impact_scopes,
      default_agents: {
        planning: ["requirements", "architect"],
        verification: ["tester", "reviewer", "release"]
      },
      ai_overlay: {
        profile: ".harness/project/overlay.yaml",
        rules_root: ".harness/project/rules",
        discovery: "auto",
        local_rule_file: null
      },
      protected_paths: [
        ".harness/**",
        ".git/**",
        "node_modules/**",
        ".env",
        ".env.*"
      ]
    }
  };
}

function normalizePlan(plan) {
  const commands = Array.isArray(plan?.project_profile?.commands)
    ? Object.fromEntries(plan.project_profile.commands.map((entry) => [entry.name, entry.command]))
    : (plan?.project_profile?.commands ?? {});
  const impactScopes = Array.isArray(plan?.project_profile?.impact_scopes)
    ? Object.fromEntries(plan.project_profile.impact_scopes.map(({ id, ...config }) => [id, config]))
    : (plan?.project_profile?.impact_scopes ?? {});
  return {
    ...plan,
    project_profile: {
      ...plan.project_profile,
      commands,
      impact_scopes: impactScopes
    }
  };
}

async function refinePlanWithAi(inspection, deterministicPlan) {
  const { Agent, run } = await import("@openai/agents");
  const AdapterPlan = z.object({
    source: z.enum(["ai", "heuristic"]).default("ai"),
    project_profile: z.object({
      name: z.string(),
      package_manager: z.string(),
      workspace_globs: z.array(z.string()).default([]),
      languages: z.array(z.string()).default([]),
      commands: z.array(z.object({
        name: z.string(),
        command: z.string()
      })).default([]),
      modules: z.array(z.object({
        id: z.string(),
        path: z.string(),
        packageName: z.string().nullable().default(null),
        agents: z.array(z.string()).default([]),
        keywords: z.array(z.string()).default([])
      })).default([]),
      business_paths: z.array(z.string()).default([]),
      impact_scopes: z.array(z.object({
        id: z.string(),
        agents: z.array(z.string()).default([]),
        write_paths: z.array(z.string()).default([]),
        artifacts: z.array(z.string()).default([])
      })).default([]),
      default_agents: z.object({
        planning: z.array(z.string()).default([]),
        verification: z.array(z.string()).default([])
      }).default({
        planning: ["requirements", "architect"],
        verification: ["tester", "reviewer", "release"]
      }),
      ai_overlay: z.object({
        profile: z.string().default(".harness/project/overlay.yaml"),
        rules_root: z.string().default(".harness/project/rules"),
        discovery: z.string().default("auto"),
        local_rule_file: z.string().nullable().default(null)
      }).default({
        profile: ".harness/project/overlay.yaml",
        rules_root: ".harness/project/rules",
        discovery: "auto",
        local_rule_file: null
      }),
      protected_paths: z.array(z.string()).default([])
    })
  });

  const inspector = new Agent({
    name: "harness project inspector",
    model: "gpt-5.4",
    modelSettings: { reasoning: { effort: "medium" } },
    outputType: AdapterPlan,
    instructions: [
      "\u4f60\u662f\u9879\u76ee harness \u9002\u914d\u5c42\u7684\u751f\u6210\u5668\u3002",
      "\u4f60\u7684\u4efb\u52a1\u662f\u57fa\u4e8e\u771f\u5b9e\u9879\u76ee\u8bc1\u636e\uff0c\u751f\u6210\u53ef\u843d\u76d8\u7684 project_profile\u3002",
      "\u4e0d\u8981\u53d1\u660e\u4e0d\u5b58\u5728\u7684\u76ee\u5f55\uff1b\u4f18\u5148\u4fdd\u7559\u786e\u5b9a\u6027\u7ed3\u679c\uff0c\u53ea\u4fee\u6b63\u660e\u663e\u8bef\u5224\u3002",
      "\u8f93\u51fa\u5fc5\u987b\u662f\u7ed3\u6784\u5316 JSON\uff0c\u4e0d\u8981\u5e26\u89e3\u91ca\u6027\u6563\u6587\u3002",
      "\u5982\u679c\u8bc1\u636e\u4e0d\u8db3\uff0c\u5c31\u4fdd\u6301 deterministic plan \u7684\u5b57\u6bb5\u4e0d\u53d8\u3002"
    ].join("\n")
  });

  const result = await run(inspector, [
    "\u8bf7\u6839\u636e\u4ee5\u4e0b\u9879\u76ee\u8bc1\u636e\uff0c\u8c03\u6574 project_profile\uff0c\u4f7f\u5176\u66f4\u8d34\u8fd1\u771f\u5b9e\u9879\u76ee\u7ed3\u6784\u3002",
    "",
    "## \u786e\u5b9a\u6027\u8ba1\u5212",
    JSON.stringify(deterministicPlan, null, 2),
    "",
    "## \u68c0\u67e5\u8bc1\u636e",
    JSON.stringify(inspection, null, 2)
  ].join("\n"));

  return result.finalOutput;
}

function assertAiConfigured() {
  if (process.env.OPENAI_API_KEY?.trim()) return;
  console.error("未检测到 OPENAI_API_KEY，无法运行 `harness inspect --ai`。");
  console.error("");
  console.error("你可以选择：");
  console.error("1. 先使用无 AI 模式：harness inspect --no-ai");
  console.error("2. 临时配置 OpenAI API Key 后重试：");
  console.error("   PowerShell: $env:OPENAI_API_KEY=\"你的 API Key\"; harness inspect --ai");
  console.error("   macOS/Linux: OPENAI_API_KEY=\"你的 API Key\" harness inspect --ai");
  console.error("");
  console.error("Harness 不会在命令行里交互式索要或保存 API Key，避免把密钥写入项目文件或 shell 历史之外的未知位置。");
  process.exit(1);
}
async function collectFileSignals({ topDirs = [], topFiles = [] } = {}) {
  const targets = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "setup.cfg",
    "CMakeLists.txt",
    "conanfile.txt",
    "conanfile.py",
    "vcpkg.json",
    "global.json",
    "ProjectSettings",
    "Assets",
    ".github",
    "docs",
    "src",
    "app",
    "apps",
    "packages",
    "services",
    "modules",
    "projects",
    "lib",
    "libs",
    "include"
  ];
  const signals = [];
  for (const target of targets) {
    if (target.includes("/")) {
      if (exactPathExists(target)) signals.push(target);
      continue;
    }
    if (topDirs.includes(target) || topFiles.includes(target)) signals.push(target);
  }
  return signals.sort();
}

function collectGitEvidence() {
  return {
    statusShort: runCommand(["git", "status", "--short"]),
    branch: runCommand(["git", "branch", "--show-current"]).trim(),
    remote: runCommand(["git", "remote", "-v"]),
    trackedFilesSample: runCommand(["git", "ls-files"])
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 500)
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

async function readTopFiles() {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
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

function detectCommands(rootPackage, packageManager, languages) {
  const scripts = rootPackage?.scripts ?? {};
  const commands = {};
  if (scripts.build) commands.build = `${packageManager} run build`;
  if (scripts.test) commands.test = `${packageManager} run test`;
  if (scripts.typecheck) commands.typecheck = `${packageManager} run typecheck`;
  if (scripts.lint) commands.lint = `${packageManager} run lint`;
  if (scripts.dev) commands.dev = `${packageManager} run dev`;
  if (scripts.preview) commands.preview = `${packageManager} run preview`;
  if (scripts.start) commands.start = `${packageManager} run start`;
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

function uniqueId(base, used) {
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function scopeId(value) {
  return String(value ?? "").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "scope";
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "").trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
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

async function readJson(target) {
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch {
    return null;
  }
}

function runCommand(parts) {
  const [command, ...commandArgs] = parts;
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8" });
  if (result.status === 0) return (result.stdout ?? "").trim();
  return [result.stdout ?? "", result.stderr ?? ""].join("").trim();
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

function renderInspectionReport(payload) {
  const profile = payload.project_profile;
  return [
    "# Harness \u9879\u76ee\u753b\u50cf",
    "",
    `- \u751f\u6210\u65f6\u95f4: ${payload.generatedAt}`,
    `- \u6765\u6e90: ${payload.source}`,
    `- \u9879\u76ee: ${profile.name}`,
    `- \u5305\u7ba1\u7406\u5668: ${profile.package_manager}`,
    `- \u8bed\u8a00: ${profile.languages.join(", ") || "-"}`,
    `- workspace_globs: ${profile.workspace_globs.join(", ") || "-"}`,
    "",
    "## \u5173\u952e\u8bc1\u636e",
    "",
    `- \u9876\u5c42\u76ee\u5f55: ${payload.inspection.evidence.topDirs.join(", ") || "-"}`,
    `- \u6587\u4ef6\u4fe1\u53f7: ${payload.inspection.evidence.fileSignals.join(", ") || "-"}`,
    `- git branch: ${payload.inspection.evidence.git.branch || "-"}`,
    `- git status: ${payload.inspection.evidence.git.statusShort || "-"}`,
    "",
    "## \u6a21\u5757",
    "",
    "| id | path | agents | keywords |",
    "| --- | --- | --- | --- |",
    ...profile.modules.map((module) => `| ${module.id} | \`${module.path}\` | ${module.agents.join(", ") || "-"} | ${module.keywords.join(", ") || "-"} |`),
    "",
    "## \u5f71\u54cd\u8303\u56f4",
    "",
    "| scope | agents | write paths | artifacts |",
    "| --- | --- | --- | --- |",
    ...Object.entries(profile.impact_scopes).map(([scope, config]) => `| ${scope} | ${config.agents.join(", ") || "-"} | ${config.write_paths.map((item) => `\`${item}\``).join("<br>") || "-"} | ${config.artifacts.map((item) => `\`${item}\``).join("<br>") || "-"} |`),
    ""
  ].join("\n");
}
function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}

