import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { matchPattern, normalizeRelPath } from "./context-mode.mjs";

const defaultOverlayPath = ".harness/project/overlay.yaml";
const defaultLocalRuleFile = null;
const discoveryExcludes = new Set([".git", ".harness", ".next", ".playwright-cli", ".agents", "node_modules", "dist", "build", "coverage", "output"]);

export async function loadProjectOverlay(root, configuredPath = defaultOverlayPath, { projectProfile = null } = {}) {
  const relPath = resolveOverlayPath(configuredPath || defaultOverlayPath);
  const absolutePath = path.join(root, relPath);
  const fallbackLocalRuleFile = resolveLocalRuleFile(projectProfile, null);
  if (!existsSync(absolutePath)) {
    return { path: relPath, exists: false, localRuleFile: fallbackLocalRuleFile, profile: null, discoveredScopes: [] };
  }

  const parsed = parseYaml(await readFile(absolutePath, "utf8")) ?? {};
  const baseProfile = parsed.ai_project ?? parsed.project ?? parsed;
  const localRuleFile = resolveLocalRuleFile(projectProfile, baseProfile);
  const { profile, discoveredScopes } = await withDiscoveredScopes(root, baseProfile, projectProfile, { localRuleFile });
  return { path: relPath, exists: true, localRuleFile, profile, discoveredScopes };
}

export function resolveImpactScopes(projectProfile = {}, overlayProfile = null) {
  const manualScopes = projectProfile.impact_scopes ?? {};
  const overlayScopes = overlayProfile?.rules?.scopes ?? {};
  const resolved = {};

  for (const [scope, rawConfig] of Object.entries(overlayScopes)) {
    const config = normalizeScopeConfig(rawConfig);
    if (!config.paths.length) continue;
    const agents = config.agents.length ? config.agents : inferAgentsFromScope(scope, config);
    resolved[scope] = {
      agents,
      write_paths: config.paths,
      artifacts: config.artifacts.length ? config.artifacts : defaultArtifactsForAgents(agents)
    };
  }

  for (const [scope, manual] of Object.entries(manualScopes)) {
    resolved[scope] = { ...(resolved[scope] ?? {}), ...manual };
  }

  return resolved;
}

export function overlayRuleFilesForAgent(overlay, agentId, options = {}) {
  const profile = overlay?.profile;
  if (!profile) return [];
  const common = asRuleFiles(profile.rules?.common);
  const roleRules = asRuleFiles(profile.rules?.roles?.[agentId]);
  const matchedScopes = inferOverlayScopes(profile, options).filter((scope) => shouldInjectScopeRulesForAgent(profile, scope, agentId));
  const scopeRules = matchedScopes.flatMap((scope) => collectScopeRuleFiles(profile, scope));
  return unique([...common, ...roleRules, ...scopeRules]).filter(Boolean);
}

export function inferOverlayScopes(profile, { allowedPatterns = [], taskText = "", runInput = "", impactScopes = [] } = {}) {
  return inferOverlayScopeMatches(profile, { allowedPatterns, taskText, runInput, impactScopes }).map((item) => item.scope);
}

export function inferOverlayScopeMatches(profile, { allowedPatterns = [], taskText = "", runInput = "", impactScopes = [] } = {}) {
  const scopes = profile?.rules?.scopes ?? {};
  if (!Object.keys(scopes).length) return [];

  const matches = [];
  const normalizedPatterns = allowedPatterns.map(normalizeRelPath).filter(Boolean);
  const haystackRaw = `${taskText}\n${runInput}`;
  const haystack = haystackRaw.toLowerCase();
  const explicitScopes = new Set(impactScopes ?? []);

  for (const [scope, rawConfig] of Object.entries(scopes)) {
    const config = normalizeScopeConfig(rawConfig);
    const reasons = [];
    let score = 0;

    if (explicitScopes.has(scope)) {
      score += 100;
      reasons.push("impact_scope");
    }

    const pathHits = config.paths.filter((pattern) => normalizedPatterns.some((item) => pathsOverlap(item, pattern)));
    if (pathHits.length > 0) {
      score += 80;
      reasons.push(`path:${pathHits.slice(0, 3).join(",")}`);
    }

    const textPathHits = config.paths.map((pattern) => globPrefix(normalizeRelPath(pattern))).filter((prefix) => prefix && haystack.includes(prefix.toLowerCase()));
    if (textPathHits.length > 0) {
      score += 60;
      reasons.push(`path_text:${textPathHits.slice(0, 3).join(",")}`);
    }

    const keywordHits = config.keywords.filter((keyword) => keywordMatches(haystackRaw, haystack, keyword));
    if (keywordHits.length > 0) {
      score += Math.min(90, keywordHits.reduce((sum, keyword) => sum + keywordScore(keyword), 0));
      reasons.push(`keyword:${keywordHits.slice(0, 5).join(",")}`);
    }

    if (score > 0) matches.push({ scope, score, confidence: confidenceForScore(score), reasons });
  }

  return matches.sort((left, right) => right.score - left.score || left.scope.localeCompare(right.scope));
}

export async function renderOverlayContext(root, overlay, agentId, { maxChars = 4000, allowedPatterns = [], taskText = "", runInput = "", impactScopes = [] } = {}) {
  const profile = overlay?.profile;
  if (!profile) return "No project overlay found.";

  const matchedScopes = inferOverlayScopes(profile, { allowedPatterns, taskText, runInput, impactScopes });
  const ruleFiles = overlayRuleFilesForAgent(overlay, agentId, { allowedPatterns, taskText, runInput, impactScopes });
  const chunks = [
    `# Project Overlay: ${profile.name ?? "project"}`,
    "",
    `- overlay: ${overlay.path}`,
    `- language.communication: ${profile.language?.communication ?? "unspecified"}`,
    `- language.artifacts: ${profile.language?.artifacts ?? "unspecified"}`,
    `- discovered_scopes: ${Object.keys(profile.rules?.scopes ?? {}).length}`,
    `- matched_scopes: ${matchedScopes.length ? matchedScopes.join(", ") : "(none)"}`,
    "",
    "## Project Rule Files",
    "",
    ...(ruleFiles.length ? ruleFiles.map((item) => `- ${item}`) : ["- (none)"])
  ];

  for (const relPath of ruleFiles) {
    const absolutePath = path.join(root, relPath);
    if (!existsSync(absolutePath)) {
      chunks.push("", `## ${relPath}`, "", "(missing)");
      continue;
    }
    const content = await readFile(absolutePath, "utf8");
    chunks.push("", `## ${relPath}`, "", limitText(content.trim(), Math.max(600, Math.floor(maxChars / Math.max(1, ruleFiles.length)))));
  }

  return limitText(chunks.join("\n"), maxChars);
}

export function overlaySummary(overlay) {
  const profile = overlay?.profile;
  if (!profile) return "No project overlay configured.";
  const scopeCount = Object.keys(profile.rules?.scopes ?? {}).length;
  return [`overlay: ${overlay.path}`, `project: ${profile.name ?? "unnamed"}`, `language: ${profile.language?.communication ?? "unspecified"}`, `scope_rules: ${scopeCount}`].join("\n");
}

function unique(items) {
  return [...new Set(items)];
}

function collectScopeRuleFiles(profile, scope, seen = new Set()) {
  if (seen.has(scope)) return [];
  seen.add(scope);

  const rawConfig = profile.rules?.scopes?.[scope];
  if (!rawConfig) return [];

  const config = normalizeScopeConfig(rawConfig);
  return [...config.files, ...config.includeScopes.flatMap((item) => collectScopeRuleFiles(profile, item, seen))];
}

function shouldInjectScopeRulesForAgent(profile, scope, agentId) {
  const crossCuttingAgents = new Set(["pm", "requirements", "requirements-plan", "architect", "tester", "reviewer", "release"]);
  if (crossCuttingAgents.has(agentId)) return true;

  const config = normalizeScopeConfig(profile.rules?.scopes?.[scope]);
  return config.agents.length === 0 || config.agents.includes(agentId);
}

function normalizeScopeConfig(rawConfig) {
  if (!rawConfig) return { agents: [], artifacts: [], files: [], paths: [], keywords: [], includeScopes: [] };
  if (typeof rawConfig === "string" || Array.isArray(rawConfig)) {
    return { agents: [], artifacts: [], files: asRuleFiles(rawConfig), paths: [], keywords: [], includeScopes: [] };
  }

  return {
    agents: asRuleFiles(rawConfig.agents),
    artifacts: asRuleFiles(rawConfig.artifacts),
    files: asRuleFiles(rawConfig.files ?? rawConfig.rules),
    paths: asRuleFiles(rawConfig.paths),
    keywords: asRuleFiles(rawConfig.keywords),
    includeScopes: asRuleFiles(rawConfig.include_scopes ?? rawConfig.includeScopes)
  };
}

function asRuleFiles(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return [value];
  return [];
}

function pathsOverlap(pathOrPattern, configuredPattern) {
  const left = normalizeRelPath(pathOrPattern);
  const right = normalizeRelPath(configuredPattern);
  if (!left || !right) return false;
  return matchPattern(left, right) || matchPattern(right, left) || sharedGlobPrefix(left, right);
}

function sharedGlobPrefix(left, right) {
  const leftPrefix = globPrefix(left);
  const rightPrefix = globPrefix(right);
  return Boolean(leftPrefix && rightPrefix && (leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix)));
}

function globPrefix(pattern) {
  return pattern.split("*")[0].replace(/\/+$/, "");
}

function limitText(text, maxChars) {
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars).trim()}\n\n...(truncated; read project overlay rule file if needed)` : text;
}

async function withDiscoveredScopes(root, profile, projectProfile, { localRuleFile = defaultLocalRuleFile } = {}) {
  const discoveryEnabled = profile.discovery?.enabled !== false;
  const discoveredScopes = discoveryEnabled ? await discoverLocalScopes(root, projectProfile, profile, localRuleFile) : [];
  const explicitScopes = profile.rules?.scopes ?? {};
  const mergedScopes = {};

  for (const scope of discoveredScopes) {
    mergedScopes[scope.id] = scope.config;
  }

  for (const [scope, explicitConfig] of Object.entries(explicitScopes)) {
    const current = normalizeScopeConfig(mergedScopes[scope]);
    const override = normalizeScopeConfig(explicitConfig);
    mergedScopes[scope] = {
      ...(typeof explicitConfig === "object" && !Array.isArray(explicitConfig) ? explicitConfig : {}),
      agents: unique([...current.agents, ...override.agents]),
      artifacts: unique([...current.artifacts, ...override.artifacts]),
      files: unique([...current.files, ...override.files]),
      paths: unique([...current.paths, ...override.paths]),
      keywords: unique([...current.keywords, ...override.keywords]),
      include_scopes: unique([...current.includeScopes, ...override.includeScopes])
    };
  }

  return {
    profile: {
      ...profile,
      rules: {
        ...(profile.rules ?? {}),
        scopes: mergedScopes
      }
    },
    discoveredScopes
  };
}

async function discoverLocalScopes(root, projectProfile, profile, localRuleFile) {
  const workspaceDirs = await discoverWorkspaceDirs(root, projectProfile, profile);
  const ruleDirs = await discoverLocalRuleDirs(root, localRuleFile);
  const candidates = unique([...workspaceDirs, ...ruleDirs]).sort();
  const packageNameToScope = new Map();
  const rawScopes = [];
  const usedIds = new Set();

  for (const relDir of candidates) {
    const absoluteDir = path.join(root, relDir);
    const rulePath = path.join(absoluteDir, localRuleFile);
    const packagePath = path.join(absoluteDir, "package.json");
    const hasRule = existsSync(rulePath);
    const packageJson = existsSync(packagePath) ? await readJson(packagePath) : null;
    if (!hasRule && !packageJson) continue;

    const ruleMeta = hasRule ? await readLocalRuleMetadata(rulePath) : {};
    const id = uniqueScopeId(relDir, usedIds, ruleMeta.scope ?? ruleMeta.id);
    usedIds.add(id);
    if (packageJson?.name) packageNameToScope.set(packageJson.name, id);
    rawScopes.push({ id, relDir, hasRule, packageJson, ruleMeta });
  }

  return rawScopes.map((scope) => ({ id: scope.id, config: scopeConfigFromDiscovery(scope, packageNameToScope, localRuleFile) }));
}

async function discoverWorkspaceDirs(root, projectProfile, profile) {
  const rootPackage = await readJson(path.join(root, "package.json"));
  const packageWorkspaces = normalizeWorkspaces(rootPackage?.workspaces);
  const configuredWorkspaces = asRuleFiles(projectProfile?.workspace_globs ?? projectProfile?.workspaces);
  const overlayWorkspaces = asRuleFiles(profile?.discovery?.workspace_globs ?? profile?.discovery?.workspaces);
  const configuredPatterns = unique([...packageWorkspaces, ...configuredWorkspaces, ...overlayWorkspaces]);
  const patterns = configuredPatterns.length ? configuredPatterns : ["src", "app", "lib", "libs/*", "services/*", "modules/*", "projects/*"];
  const dirs = [];

  for (const pattern of patterns) {
    dirs.push(...await expandSimpleWorkspacePattern(root, pattern));
  }

  return unique(dirs);
}

async function discoverLocalRuleDirs(root, localRuleFile) {
  const dirs = [];
  const ruleFile = normalizeRelPath(localRuleFile || defaultLocalRuleFile);
  if (!ruleFile) return dirs;

  async function walk(current, depth) {
    if (depth > 5) return;
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    const rulePath = path.join(current, ruleFile);
    if (existsSync(rulePath)) dirs.push(path.relative(root, current).replaceAll("\\", "/"));

    for (const entry of entries) {
      if (!entry.isDirectory() || discoveryExcludes.has(entry.name)) continue;
      await walk(path.join(current, entry.name), depth + 1);
    }
  }

  await walk(root, 0);
  return unique(dirs);
}

async function expandSimpleWorkspacePattern(root, pattern) {
  const normalized = normalizeRelPath(pattern);
  if (!normalized || normalized.includes("**")) return [];
  const starIndex = normalized.indexOf("*");
  if (starIndex === -1) {
    const target = path.join(root, normalized);
    return existsSync(target) ? [normalized] : [];
  }

  const prefix = normalized.slice(0, starIndex).replace(/\/+$/, "");
  const suffix = normalized.slice(starIndex + 1).replace(/^\/+/, "");
  const baseDir = path.join(root, prefix || ".");
  const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory() && !discoveryExcludes.has(entry.name))
    .map((entry) => normalizeRelPath(path.posix.join(prefix, entry.name, suffix)))
    .filter((relDir) => existsSync(path.join(root, relDir)));
}

function scopeConfigFromDiscovery(scope, packageNameToScope, localRuleFile) {
  const dependencies = dependencyNames(scope.packageJson);
  const metaAgents = asRuleFiles(scope.ruleMeta?.agents ?? scope.ruleMeta?.agent);
  const agents = metaAgents.length ? metaAgents : inferAgentsFromPackage(scope.relDir, scope.packageJson);
  const includeScopes = dependencies.map((dependency) => packageNameToScope.get(dependency)).filter((item) => item && item !== scope.id);
  const metaPaths = resolveScopeRelativePaths(scope.relDir, scope.ruleMeta?.paths ?? scope.ruleMeta?.write_paths);
  const metaFiles = resolveScopeRelativePaths(scope.relDir, scope.ruleMeta?.files ?? scope.ruleMeta?.rules);
  const metaIncludes = asRuleFiles(scope.ruleMeta?.include_scopes ?? scope.ruleMeta?.includeScopes);
  const metaKeywords = asRuleFiles(scope.ruleMeta?.keywords ?? scope.ruleMeta?.aliases);

  return {
    description: scope.ruleMeta?.description ?? `Auto-discovered local AI scope for ${scope.relDir}.`,
    generated: true,
    agents,
    paths: unique([`${scope.relDir}/**`, ...metaPaths]),
    keywords: unique([...inferKeywords(scope.id, scope.relDir, scope.packageJson, dependencies), ...metaKeywords]),
    files: unique([...(scope.hasRule ? [`${scope.relDir}/${localRuleFile}`] : []), ...metaFiles]),
    artifacts: asRuleFiles(scope.ruleMeta?.artifacts),
    include_scopes: unique([...includeScopes, ...metaIncludes])
  };
}

function inferAgentsFromPackage(relDir, packageJson) {
  const loweredPath = relDir.toLowerCase();
  const dependencies = dependencyNames(packageJson).map((item) => item.toLowerCase());
  const has = (name) => dependencies.includes(name);

  if (has("@nestjs/common") || has("express") || has("fastify") || loweredPath.includes("/api") || loweredPath.endsWith("api")) return ["backend"];
  if (has("next") || has("react") || has("vue") || has("@angular/core") || has("vite") || loweredPath.includes("/ui") || loweredPath.endsWith("ui")) return ["frontend"];
  if (loweredPath.includes("sdk")) return ["frontend"];
  if (loweredPath.includes("types") || loweredPath.includes("schema")) return ["backend"];
  return ["frontend"];
}

function inferAgentsFromScope(scope, config) {
  const syntheticPackage = { name: scope, dependencies: Object.fromEntries(config.keywords.map((item) => [item, "*"])) };
  return inferAgentsFromPackage(scope, syntheticPackage);
}

function inferKeywords(scopeId, relDir, packageJson, dependencies) {
  const base = [scopeId, relDir, path.basename(relDir), packageJson?.name, packageJson?.name?.split("/").pop(), ...scopeAliases(scopeId, relDir), ...frameworkKeywords(dependencies)];
  return unique(base.filter(Boolean));
}

function scopeAliases(scopeId, relDir) {
  const normalized = `${scopeId} ${relDir}`.toLowerCase();
  const aliases = [];
  if (/\bweb\b/.test(normalized)) aliases.push("web", "网站", "前台", "首页", "文章", "详情页", "内容页");
  if (/\badmin\b/.test(normalized)) aliases.push("admin", "后台", "管理台", "cms", "登录", "表单", "表格");
  if (/\bapi\b/.test(normalized)) aliases.push("api", "后端", "接口", "服务", "controller", "认证", "授权");
  if (/\bui\b/.test(normalized)) aliases.push("ui", "共享组件", "组件库");
  if (/\btypes\b/.test(normalized)) aliases.push("types", "类型", "schema", "契约", "zod");
  if (/\bsdk\b/.test(normalized)) aliases.push("sdk", "SDK", "api client", "客户端", "请求封装");
  return aliases;
}

function frameworkKeywords(dependencies) {
  const lowered = dependencies.map((item) => item.toLowerCase());
  const keywords = [];
  if (lowered.includes("next")) keywords.push("next", "next.js", "web", "frontend", "前端", "页面");
  if (lowered.includes("react")) keywords.push("react", "frontend", "前端");
  if (lowered.includes("vite")) keywords.push("vite", "frontend", "前端");
  if (lowered.includes("antd")) keywords.push("antd", "admin", "后台", "管理台");
  if (lowered.includes("@nestjs/common")) keywords.push("nestjs", "api", "backend", "后端", "接口");
  if (lowered.includes("zod")) keywords.push("schema", "types", "类型", "契约");
  return keywords;
}

function dependencyNames(packageJson) {
  if (!packageJson) return [];
  return unique([...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.devDependencies ?? {}), ...Object.keys(packageJson.peerDependencies ?? {}), ...Object.keys(packageJson.optionalDependencies ?? {})]);
}

function defaultArtifactsForAgents(agents) {
  const artifacts = [];
  if (agents.includes("backend")) artifacts.push(".harness/runs/<run>/artifacts/api-change.md");
  if (agents.includes("database")) artifacts.push(".harness/runs/<run>/artifacts/db-migration.md");
  if (agents.includes("devops")) artifacts.push(".harness/runs/<run>/artifacts/release-summary.md");
  if (agents.includes("frontend") || agents.includes("backend")) artifacts.push(".harness/runs/<run>/artifacts/test-report.md");
  return unique(artifacts);
}

function uniqueScopeId(relDir, usedIds, preferredId = null) {
  const preferred = normalizeScopeId(preferredId);
  const base = preferred || normalizeScopeId(path.basename(relDir)) || "scope";
  if (!usedIds.has(base)) return base;
  const parent = normalizeScopeId(path.basename(path.dirname(relDir)));
  const withParent = `${parent}-${base}`;
  if (!usedIds.has(withParent)) return withParent;
  let index = 2;
  while (usedIds.has(`${withParent}-${index}`)) index += 1;
  return `${withParent}-${index}`;
}

function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) return workspaces.filter(Boolean);
  if (Array.isArray(workspaces?.packages)) return workspaces.packages.filter(Boolean);
  return [];
}

async function readJson(target) {
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch {
    return null;
  }
}

async function readLocalRuleMetadata(target) {
  try {
    const content = (await readFile(target, "utf8")).replace(/^\uFEFF/, "");
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
    if (!match) return {};
    return parseYaml(match[1]) ?? {};
  } catch {
    return {};
  }
}

function resolveLocalRuleFile(projectProfile, profile) {
  const configured = projectProfile?.ai_overlay?.local_rule_file ?? profile?.discovery?.local_rule_file ?? defaultLocalRuleFile;
  return configured ? normalizeRelPath(configured) : null;
}

function resolveOverlayPath(configuredPath) {
  return normalizeRelPath(configuredPath || defaultOverlayPath);
}

function resolveScopeRelativePaths(relDir, values) {
  return asRuleFiles(values)
    .map((value) => {
      const raw = String(value).trim().replaceAll("\\", "/");
      const normalized = normalizeRelPath(raw);
      if (!normalized) return "";
      if (isRepoRootPattern(normalized) || normalized === relDir || normalized.startsWith(`${relDir}/`)) return normalized;
      return normalizeRelPath(path.posix.join(relDir, normalized));
    })
    .filter(Boolean);
}

function isRepoRootPattern(pattern) {
  return /^(apps|packages|services|libs|modules|projects|infra|docs|\.harness|\.github)\//.test(pattern);
}

function normalizeScopeId(value) {
  return String(value ?? "").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function keywordMatches(haystackRaw, haystack, keyword) {
  const text = String(keyword ?? "").trim();
  if (!text) return false;
  const lowered = text.toLowerCase();
  if (lowered === "ui") return false;
  if (/^[a-z0-9_-]+$/i.test(text)) {
    return new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(lowered)}([^a-z0-9_-]|$)`, "i").test(haystackRaw);
  }
  return haystack.includes(lowered);
}

function keywordScore(keyword) {
  const length = String(keyword ?? "").trim().length;
  if (length <= 0) return 0;
  if (length <= 2) return 34;
  if (length <= 5) return 40;
  return 50;
}

function confidenceForScore(score) {
  if (score >= 80) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
