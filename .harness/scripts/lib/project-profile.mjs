import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const projectProfilePath = ".harness/project/profile.yaml";

export async function loadProjectProfile(root = process.cwd()) {
  const profilePath = path.join(root, projectProfilePath);
  const sourcePath = projectProfilePath;

  if (!existsSync(path.join(root, sourcePath))) {
    return {
      source: projectProfilePath,
      project_profile: defaultProjectProfile()
    };
  }

  const parsed = parseYaml(await readFile(path.join(root, sourcePath), "utf8")) ?? {};
  const profile = normalizeProjectProfile(parsed.project_profile ?? parsed);
  return { source: sourcePath, project_profile: profile };
}

export function normalizeProjectProfile(profile = {}) {
  const productDocs = normalizeProductDocs(profile.product_docs, profile);
  return {
    ...profile,
    ai_overlay: {
      profile: ".harness/project/overlay.yaml",
      rules_root: ".harness/project/rules",
      discovery: "auto",
      local_rule_file: null,
      ...(profile.ai_overlay ?? {})
    },
    workspace_globs: profile.workspace_globs ?? profile.workspaces ?? [],
    product_docs: productDocs,
    protected_product_docs: profile.protected_product_docs ?? productDocs.protected_paths,
    business_paths: profile.business_paths ?? defaultBusinessPaths(productDocs),
    protected_paths: profile.protected_paths ?? defaultProtectedPaths(productDocs)
  };
}

export function productDocsPath(projectProfile, fallback = "") {
  return normalizeRelPath(projectProfile?.product_docs?.path ?? fallback);
}

export function productDocsRunsPath(projectProfile, fallback = null) {
  const productPath = productDocsPath(projectProfile);
  if (!productPath) return "";
  return normalizeRelPath(projectProfile?.product_docs?.runs_path ?? fallback ?? `${productPath}/runs`);
}

export function businessPathPatterns(projectProfile) {
  return asArray(projectProfile?.business_paths).map(normalizeRelPath).filter(Boolean);
}

export function protectedPathPatterns(projectProfile) {
  return asArray(projectProfile?.protected_paths).map(normalizeRelPath).filter(Boolean);
}

export function defaultProjectProfile() {
  return normalizeProjectProfile({
    name: "Generic project",
    package_manager: "npm",
    product_docs: {
      enabled: false,
      path: "",
      runs_path: "",
      protected_paths: [],
      sync: {
        enabled: false,
        require_release: false,
        require_user_confirmation: false
      }
    },
    ai_overlay: {
      profile: ".harness/project/overlay.yaml",
      local_rule_file: null
    },
    workspace_globs: [],
    commands: {},
    impact_scopes: {},
    default_agents: {
      planning: ["requirements", "architect"],
      verification: ["tester", "reviewer", "release"]
    }
  });
}

function normalizeProductDocs(productDocs, profile) {
  const enabled = productDocs?.enabled ?? profile.product_docs_enabled ?? false;
  const legacyProtected = profile.protected_product_docs ?? [];
  const inferredPath = enabled
    ? (productDocs?.path ?? inferProductDocsPath(legacyProtected) ?? "")
    : (productDocs?.path ?? "");
  const pathValue = normalizeRelPath(inferredPath);
  const protectedPaths = enabled
    ? asArray(productDocs?.protected_paths ?? (legacyProtected.length ? legacyProtected : (pathValue ? [`${pathValue}/**`] : [])))
    : asArray(productDocs?.protected_paths ?? legacyProtected);
  return {
    enabled,
    path: pathValue,
    runs_path: normalizeRelPath(productDocs?.runs_path ?? (pathValue ? `${pathValue}/runs` : "")),
    protected_paths: protectedPaths,
    sync: {
      enabled,
      require_release: enabled,
      require_user_confirmation: enabled,
      ...(productDocs?.sync ?? {})
    }
  };
}

function inferProductDocsPath(patterns) {
  const first = asArray(patterns)[0];
  if (!first) return "";
  return normalizeRelPath(first).replace(/\/\*\*$/, "");
}

function defaultBusinessPaths(productDocs) {
  const paths = [
    "src/**",
    "app/**",
    "apps/**",
    "lib/**",
    "libs/**",
    "packages/**",
    "services/**",
    "modules/**",
    "projects/**",
    "client/**",
    "frontend/**",
    "backend/**",
    "infra/**",
    ".github/workflows/**"
  ];
  return productDocs?.enabled ? [...asArray(productDocs.protected_paths), ...paths] : paths;
}

function defaultProtectedPaths(productDocs) {
  return [
    ".harness/**",
    ".git/**",
    "node_modules/**",
    ".env",
    ".env.*",
    ...asArray(productDocs.protected_paths)
  ];
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "").trim();
}
