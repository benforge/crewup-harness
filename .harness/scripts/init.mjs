import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const projectNameArg = valueOf("--name=");

const profilePath = path.join(root, ".harness", "project", "profile.yaml");
const overlayPath = path.join(root, ".harness", "project", "overlay.yaml");
const inspectPath = path.join(root, ".harness", "project", "inspect.json");
const rulesDir = path.join(root, ".harness", "project", "rules");
const profile = await loadProjectProfileSpec();
const overlay = buildOverlay(profile);
const files = [
  { path: profilePath, content: renderProfile(profile) },
  { path: overlayPath, content: renderOverlay(overlay) },
  { path: path.join(rulesDir, "language.md"), content: languageRule() },
  { path: path.join(rulesDir, "testing.md"), content: testingRule(profile) },
  { path: path.join(rulesDir, "domain.md"), content: domainRule(profile) }
];

if (dryRun) {
  console.log(JSON.stringify({
    profile,
    files: files.map((file) => rel(file.path))
  }, null, 2));
  process.exit(0);
}

for (const file of files) {
  await writeGeneratedFile(file.path, file.content);
}

console.log("Harness 项目适配层已初始化：");
console.log(`- ${rel(profilePath)}`);
console.log(`- ${rel(overlayPath)}`);
console.log(`- ${rel(rulesDir)}`);

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
  const markers = [
    ["javascript", ["package.json"]],
    ["python", ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg"]],
    ["cpp", ["CMakeLists.txt", "conanfile.txt", "conanfile.py", "vcpkg.json"]],
    ["unity", ["Assets", "ProjectSettings", "Packages/manifest.json"]],
    ["dotnet", ["global.json"]]
  ];
  return markers
    .filter(([, files]) => files.some((file) => existsSync(path.join(root, file)) || topDirs.includes(file)))
    .map(([language]) => language);
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
  if (existsSync(path.join(root, "ProjectSettings"))) return "unity";
  return "manual";
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
  ].some((file) => existsSync(path.join(root, file)));
}

function isHarnessTemplatePackage(packageJson) {
  return packageJson?.name === "eff-harness";
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

function renderOverlay(overlay) {
  return `${yaml({
    ai_project: {
      version: "1.0.0",
      name: overlay.name,
      description: "由 harness:init 生成的项目专属 AI overlay。",
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
            description: `项目范围：${scope.path}。`,
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
  return `# 语言规则

- 除非用户另有要求，默认用中文和用户沟通。
- 代码标识符、命令、文件路径、API 名称和库名称保留原语言。
- 产物应简洁、具体，并贴合当前项目结构。
`;
}

function testingRule(profile) {
  const commands = Object.entries(profile.commands).map(([name, command]) => `- ${name}: \`${command}\``).join("\n") || "- 未检测到项目级测试命令。";
  return `# 测试规则

## 项目命令

${commands}

## 策略

- 优先选择与变更范围最相关、最小的验证命令。
- 在 run 产物中记录命令、退出码和未解决风险。
- 没有运行验证命令时，不要宣称验证已通过。
`;
}

function domainRule(profile) {
  const modules = profile.modules.map((module) => `- ${module.id}: ${module.path} (${module.agents.join(", ")})`).join("\n") || "- 暂未检测到模块。";
  return `# 领域规则

这个文件由 harness:init 生成，作为项目规则起点。随着项目成熟，应把通用说明替换成真实产品和领域规则。

## 检测到的模块

${modules}
`;
}

async function writeGeneratedFile(target, content) {
  if (existsSync(target) && !force) {
    console.log(`已跳过存在的文件：${rel(target)}（使用 --force 可覆盖）`);
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
      if (isScalar(child) || (Array.isArray(child) && child.length === 0)) return `${space(indent)}${key}: ${yaml(child, 0)}`;
      return `${space(indent)}${key}:\n${yaml(child, indent + 2)}`;
    }).join("\n");
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null || value === undefined) return "null";
  return String(value);
}

function yamlInlineOrBlock(value, indent) {
  if (isScalar(value)) return yaml(value, 0);
  return `\n${yaml(value, indent)}`;
}

function isScalar(value) {
  return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value);
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

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}
