import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadProjectProfile } from "./lib/project-profile.mjs";
import { loadProjectOverlay, resolveImpactScopes } from "./lib/project-overlay.mjs";

const root = process.cwd();
const knowledgeDir = path.join(root, ".harness", "knowledge");
const reportsDir = path.join(root, ".harness", "reports");
const runsRoot = path.join(root, ".harness", "runs");
const backlogRoot = path.join(root, ".harness", "backlog");

await mkdir(knowledgeDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

const { project_profile: projectProfile } = await loadProjectProfile(root);
const overlay = await loadProjectOverlay(root, projectProfile.ai_overlay?.profile, { projectProfile });
const scopes = resolveImpactScopes(projectProfile, overlay.profile);
const packages = await collectPackages();
const board = await collectBoard();
const runIndex = await collectRunIndex();

const moduleIndex = buildModuleIndex({ scopes, packages, overlay });
await writeFile(path.join(knowledgeDir, "module-index.json"), `${JSON.stringify(moduleIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(knowledgeDir, "run-index.json"), `${JSON.stringify(runIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(knowledgeDir, "decision-index.md"), renderDecisionIndex(runIndex), "utf8");
await writeFile(path.join(knowledgeDir, "dev-map.md"), renderDevMap(moduleIndex), "utf8");
await writeFile(path.join(knowledgeDir, "task-board.md"), renderTaskBoard(board), "utf8");
await ensureLessonsFile();
await writeFile(path.join(reportsDir, "knowledge-refresh.md"), renderRefreshReport(moduleIndex, board), "utf8");

console.log("Harness 知识层已刷新：");
console.log(`- ${rel(path.join(knowledgeDir, "dev-map.md"))}`);
console.log(`- ${rel(path.join(knowledgeDir, "task-board.md"))}`);
console.log(`- ${rel(path.join(knowledgeDir, "module-index.json"))}`);
console.log(`- ${rel(path.join(knowledgeDir, "run-index.json"))}`);
console.log(`- ${rel(path.join(knowledgeDir, "decision-index.md"))}`);
console.log(`- ${rel(path.join(knowledgeDir, "lessons-learned.md"))}`);

async function collectPackages() {
  const dirs = await discoverPackageDirs();
  const items = [];
  const localRuleFile = projectProfile.ai_overlay?.local_rule_file ?? null;
  for (const dir of dirs) {
    const packagePath = path.join(root, dir, "package.json");
    const aiRulePath = localRuleFile ? path.join(root, dir, localRuleFile) : null;
    const packageJson = existsSync(packagePath) ? await readJson(packagePath) : null;
    if (!packageJson && !(aiRulePath && existsSync(aiRulePath))) continue;
    items.push({
      path: dir,
      packageName: packageJson?.name ?? null,
      version: packageJson?.version ?? null,
      scripts: Object.keys(packageJson?.scripts ?? {}).sort(),
      dependencies: dependencyNames(packageJson).sort(),
      aiRules: aiRulePath && existsSync(aiRulePath) ? rel(aiRulePath) : null
    });
  }
  return items.sort((left, right) => left.path.localeCompare(right.path));
}

async function discoverPackageDirs() {
  const rootPackage = await readJson(path.join(root, "package.json"));
  const configuredPatterns = [
    ...normalizeWorkspaces(rootPackage?.workspaces),
    ...(projectProfile.workspace_globs ?? [])
  ];
  const patterns = configuredPatterns.length ? configuredPatterns : ["src", "app", "lib", "libs/*", "services/*", "modules/*", "projects/*"];
  const dirs = [];
  for (const pattern of [...new Set(patterns)]) {
    dirs.push(...await expandWorkspacePattern(pattern));
  }
  return [...new Set(dirs)].filter((dir) => !dir.includes("node_modules")).sort();
}

async function expandWorkspacePattern(pattern) {
  const normalized = normalizeRelPath(pattern);
  if (!normalized || normalized.includes("**")) return [];
  const starIndex = normalized.indexOf("*");
  if (starIndex === -1) return existsSync(path.join(root, normalized)) ? [normalized] : [];
  const prefix = normalized.slice(0, starIndex).replace(/\/+$/, "");
  const suffix = normalized.slice(starIndex + 1).replace(/^\/+/, "");
  const baseDir = path.join(root, prefix || ".");
  const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory() && !["node_modules", ".next", "dist", "build", "coverage"].includes(entry.name))
    .map((entry) => normalizeRelPath(path.posix.join(prefix, entry.name, suffix)))
    .filter((dir) => existsSync(path.join(root, dir)));
}

function buildModuleIndex({ scopes, packages, overlay }) {
  const scopeEntries = Object.entries(scopes ?? {}).map(([id, config]) => ({
    id,
    agents: asList(config.agents),
    writePaths: asList(config.write_paths ?? config.paths),
    artifacts: asList(config.artifacts),
    ruleFiles: scopeRuleFiles(overlay.profile?.rules?.scopes?.[id]),
    keywords: asList(overlay.profile?.rules?.scopes?.[id]?.keywords),
    includeScopes: asList(overlay.profile?.rules?.scopes?.[id]?.include_scopes)
  })).sort((left, right) => left.id.localeCompare(right.id));

  return {
    generatedAt: new Date().toISOString(),
    project: projectProfile.name ?? "project",
    overlay: overlay.path,
    localRuleFile: overlay.localRuleFile,
    packageManager: projectProfile.package_manager ?? "npm",
    commands: projectProfile.commands ?? {},
    scopeCount: scopeEntries.length,
    packageCount: packages.length,
    scopes: scopeEntries,
    packages
  };
}

async function collectBoard() {
  const queues = ["new", "ready", "in-progress", "review", "done"];
  const backlog = {};
  for (const queue of queues) {
    backlog[queue] = await listBacklog(queue);
  }
  const runs = await listRuns();
  return {
    generatedAt: new Date().toISOString(),
    backlog,
    runs
  };
}

async function listBacklog(queue) {
  const dir = path.join(backlogRoot, queue);
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name).sort();
  const items = [];
  for (const file of files) {
    const content = await readFile(path.join(dir, file), "utf8");
    items.push({
      file,
      title: titleFromMarkdown(content) ?? file.replace(/\.md$/, ""),
      path: `.harness/backlog/${queue}/${file}`
    });
  }
  return items;
}

async function listRuns() {
  const entries = await readdir(runsRoot, { withFileTypes: true }).catch(() => []);
  const runs = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const runDir = path.join(runsRoot, entry.name);
    const statePath = path.join(runDir, "state.json");
    const nativeStatePath = path.join(runDir, "logs", "native-subagents", "native-state.json");
    const state = existsSync(statePath) ? await readJson(statePath) : {};
    const nativeState = existsSync(nativeStatePath) ? await readJson(nativeStatePath) : null;
    runs.push({
      id: entry.name,
      stage: state?.stage ?? "unknown",
      status: state?.status ?? "unknown",
      updatedAt: state?.updatedAt ?? null,
      native: summarizeNative(nativeState)
    });
  }
  return runs;
}

async function collectRunIndex() {
  const entries = await readdir(runsRoot, { withFileTypes: true }).catch(() => []);
  const runs = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const runDir = path.join(runsRoot, entry.name);
    const artifactsDir = path.join(runDir, "artifacts");
    const statePath = path.join(runDir, "state.json");
    const input = await readOptional(path.join(runDir, "input.md"));
    const state = existsSync(statePath) ? await readJson(statePath) : {};
    const requirement = await readOptional(path.join(artifactsDir, "requirement.md"));
    const architecture = await readOptional(path.join(artifactsDir, "architecture.md"));
    const release = await readOptional(path.join(artifactsDir, "release-summary.md"));
    const apiChange = await readOptional(path.join(artifactsDir, "api-change.md"));
    const dbChange = await readOptional(path.join(artifactsDir, "db-migration.md"));

    runs.push({
      runId: entry.name,
      title: firstHeading(input) ?? humanizeRunId(entry.name),
      stage: state?.stage ?? "unknown",
      status: state?.status ?? "unknown",
      workflowProfile: state?.workflowProfile ?? null,
      updatedAt: state?.updatedAt ?? null,
      sourceRequirement: state?.sourceRequirement ?? null,
      modules: compactList([
        ...checkedItems(architecture, "影响范围"),
        ...checkedItems(requirement, "影响范围")
      ].map(moduleLabel), 8, 80),
      capabilities: compactList([
        ...bullets(release, "变更内容"),
        ...bullets(requirement, "目标")
      ], 6),
      decisions: compactList([
        ...bullets(architecture, "方案"),
        ...bullets(requirement, "回滚方式")
      ], 6),
      apiChanges: compactList(bullets(apiChange, "是否涉及 API"), 4),
      dbChanges: compactList(bullets(dbChange, "是否涉及数据库"), 4),
      followups: compactList([
        ...bullets(release, "后续步骤"),
        ...bullets(architecture, "风险")
      ], 5)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    maxEntryChars: 1200,
    runs: runs.map(limitRunIndexEntry)
  };
}

function summarizeNative(nativeState) {
  if (!nativeState) return { planned: 0, running: 0, waitingReview: 0, closed: 0, fallback: null };
  const agents = nativeState.agents ?? [];
  return {
    planned: agents.filter((agent) => agent.status === "planned").length,
    running: agents.filter((agent) => agent.status === "running").length,
    waitingReview: agents.filter((agent) => agent.status === "waiting_review").length,
    closed: agents.filter((agent) => agent.status === "closed").length,
    fallback: nativeState.fallback?.reason ?? null
  };
}

function renderDevMap(index) {
  const lines = [
    "# Harness 项目导航地图",
    "",
    "> 本文件由 `npm run harness:knowledge` 自动生成。不要手工维护这里的包列表；项目适配规则统一维护在 `.harness/project/`。",
    "",
    "## 项目",
    "",
    `- 名称：${index.project}`,
    `- 包管理器：${index.packageManager}`,
    `- overlay: ${index.overlay}`,
    `- 本地规则文件：${index.localRuleFile}`,
    `- 生成时间：${index.generatedAt}`,
    "",
    "## 标准命令",
    "",
    ...Object.entries(index.commands).map(([name, command]) => `- ${name}: \`${command}\``),
    "",
    "## 模块",
    "",
    "| 路径 | 包名 | 脚本 | 本地规则 |",
    "| --- | --- | --- | --- |",
    ...index.packages.map((item) => `| \`${item.path}\` | ${item.packageName ?? "-"} | ${item.scripts.length ? item.scripts.map((script) => `\`${script}\``).join(", ") : "-"} | ${item.aiRules ? `\`${item.aiRules}\`` : "-"} |`),
    "",
    "## 影响范围",
    "",
    "| 影响范围(scope) | 负责 agent | 可写路径 | 规则文件 |",
    "| --- | --- | --- | --- |",
    ...index.scopes.map((scope) => `| ${scope.id} | ${scope.agents.join(", ") || "-"} | ${scope.writePaths.map((item) => `\`${item}\``).join("<br>") || "-"} | ${scope.ruleFiles.map((item) => `\`${item}\``).join("<br>") || "-"} |`),
    "",
    "## 角色使用方式",
    "",
    "- PM / requirements：扩写模糊需求前先看本文件，了解项目模块和当前 scope。",
    "- Architect：把 scope 和模块路径作为第一版影响地图，再通过读取真实代码确认。",
    "- 实现类 agent：本文件只作为入口索引；编辑前必须读取 allowed write scope 内的真实文件。",
    "- Reviewer / tester：对照本地图检查需求声明的影响范围是否遗漏模块。",
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function renderTaskBoard(board) {
  const lines = [
    "# Harness 任务看板",
    "",
    "> 本文件由 `npm run harness:knowledge` 自动生成，是给 PM、requirements、reviewer 和 release agent 使用的轻量项目记忆。",
    "",
    `- 生成时间：${board.generatedAt}`,
    "",
    "## 需求池（Backlog）",
    ""
  ];

  for (const [queue, items] of Object.entries(board.backlog)) {
    lines.push(`### ${queueLabel(queue)}`, "");
    if (!items.length) {
      lines.push("- 暂无", "");
      continue;
    }
    for (const item of items.slice(0, 20)) lines.push(`- ${item.file}: ${item.title}`);
    if (items.length > 20) lines.push(`- 另有 ${items.length - 20} 项未展开`);
    lines.push("");
  }

  lines.push("## 运行记录（Runs）", "", "| run | 状态 | 阶段 | 原生子 agent |", "| --- | --- | --- | --- |");
  for (const run of board.runs.slice(-25).reverse()) {
    const native = run.native.fallback
      ? `降级原因：${run.native.fallback}`
      : `计划 ${run.native.planned}，运行中 ${run.native.running}，待复查 ${run.native.waitingReview}，已关闭 ${run.native.closed}`;
    lines.push(`| ${run.id} | ${run.status} | ${run.stage} | ${native} |`);
  }
  lines.push("", "## 看板使用方式", "", "- 创建新 backlog 前先看本看板，避免重复需求。", "- 规划相邻需求前先看最近 runs，理解近期变更。", "- 如果 run 卡在 fallback/running agent 状态，先处理生命周期状态，再启动重叠工作。", "");
  return `${lines.join("\n")}\n`;
}

function renderDecisionIndex(index) {
  const lines = [
    "# Harness 决策索引",
    "",
    "> 本文件由 `npm run harness:knowledge` 自动生成。它是跨 run 的轻量记忆索引，只放摘要；需要细节时再打开对应 run artifact。",
    "",
    `- 生成时间：${index.generatedAt}`,
    `- run 数量：${index.runs.length}`,
    "",
    "## 最近决策",
    "",
    "| run | 状态 | 模块 | 能力 / 决策摘要 |",
    "| --- | --- | --- | --- |"
  ];

  for (const run of index.runs.slice(-30).reverse()) {
    const modules = run.modules.length ? run.modules.join(", ") : "-";
    const summary = [...run.capabilities, ...run.decisions].slice(0, 4).join("<br>") || "-";
    lines.push(`| ${run.runId} | ${run.status}/${run.stage} | ${modules} | ${summary} |`);
  }

  lines.push("", "## 使用规则", "", "- 新需求只默认读取本索引，不默认读取历史 run 全文。", "- 最多选择 3 个相关历史 run 深读。", "- 只有命中高风险、跨模块或用户要求追溯时，才打开对应 artifacts。", "");
  return `${lines.join("\n")}\n`;
}

async function ensureLessonsFile() {
  const target = path.join(knowledgeDir, "lessons-learned.md");
  if (existsSync(target)) return;
  const lines = [
    "# Harness 经验沉淀",
    "",
    "本文件用于把重复错误、流程漏洞和有效经验晋级为可维护的 harness 资产。",
    "",
    "## 晋级规则",
    "",
    "- 如果经验可以机械检查，晋级为 script 或 gate。",
    "- 如果经验是行为约束，晋级为 `.harness/rules/` 或 `.harness/project/rules/`。",
    "- 如果经验是项目结构知识，晋级为 dev-map 输入、package metadata 或 `.harness/project/overlay.yaml`。",
    "- 团队级规则不要只留在聊天记忆里。",
    "",
    "## 待晋级经验",
    "",
    "| 日期 | 来源 run | 经验 | 晋级到 | 状态 |",
    "| --- | --- | --- | --- | --- |",
    "",
    "## 已晋级经验",
    "",
    "| 日期 | 来源 run | 经验 | 已落地到 |",
    "| --- | --- | --- | --- |",
    ""
  ];
  await writeFile(target, `${lines.join("\n")}\n`, "utf8");
}

function renderRefreshReport(index, board) {
  return [
    "# 知识层刷新报告",
    "",
    `- 生成时间：${new Date().toISOString()}`,
    `- 包数量：${index.packageCount}`,
    `- scope 数量：${index.scopeCount}`,
    `- backlog/new：${board.backlog.new.length}`,
    `- backlog/ready：${board.backlog.ready.length}`,
    `- runs：${board.runs.length}`,
    "",
    "生成文件：",
    "",
    "- `.harness/knowledge/dev-map.md`",
    "- `.harness/knowledge/task-board.md`",
    "- `.harness/knowledge/module-index.json`",
    "- `.harness/knowledge/run-index.json`",
    "- `.harness/knowledge/decision-index.md`",
    "- `.harness/knowledge/lessons-learned.md`",
    ""
  ].join("\n");
}

async function readOptional(target) {
  try {
    return await readFile(target, "utf8");
  } catch {
    return "";
  }
}

function limitRunIndexEntry(entry) {
  const compact = { ...entry };
  for (const key of ["modules", "capabilities", "decisions", "apiChanges", "dbChanges", "followups"]) {
    compact[key] = compactList(compact[key], key === "modules" ? 8 : 5, 180);
  }
  const serialized = JSON.stringify(compact);
  if (serialized.length <= 1200) return compact;
  return {
    ...compact,
    capabilities: compactList(compact.capabilities, 3, 140),
    decisions: compactList(compact.decisions, 3, 140),
    followups: compactList(compact.followups, 2, 120)
  };
}

function compactList(items, maxItems = 5, maxChars = 180) {
  return [...new Set((items ?? []).map(cleanListItem).filter(Boolean))]
    .slice(0, maxItems)
    .map((item) => limitText(item, maxChars));
}

function bullets(markdown, heading) {
  return sectionText(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function checkedItems(markdown, heading) {
  return sectionText(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^- \[[xX]\]/.test(line))
    .map((line) => line.replace(/^- \[[xX]\]\s*/, "").trim())
    .filter(Boolean);
}

function sectionText(markdown, heading) {
  if (!markdown) return "";
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(markdown);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function firstHeading(markdown) {
  const line = markdown.split(/\r?\n/).find((item) => item.startsWith("# "));
  return line?.replace(/^#\s+/, "").trim();
}

function humanizeRunId(id) {
  return id.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
}

function cleanListItem(item) {
  return String(item ?? "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\[[ xX]\]\s*/, "")
    .replace(/^无$|^暂无$|^-$|^待.*补充。?$/i, "")
    .replace(/^(是|否)$/i, "")
    .trim();
}

function moduleLabel(item) {
  const cleaned = cleanListItem(item);
  if (!cleaned) return "";
  return cleaned.split(/[：:]/)[0].trim();
}

function limitText(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, maxChars).trim()}...` : text;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function queueLabel(queue) {
  const labels = {
    new: "新建（new）",
    ready: "已就绪（ready）",
    "in-progress": "进行中（in-progress）",
    review: "评审中（review）",
    done: "已完成（done）"
  };
  return labels[queue] ?? queue;
}

function scopeRuleFiles(rawConfig) {
  if (!rawConfig) return [];
  if (typeof rawConfig === "string") return [rawConfig];
  if (Array.isArray(rawConfig)) return rawConfig;
  return asList(rawConfig.files ?? rawConfig.rules);
}

function titleFromMarkdown(content) {
  const heading = content.split(/\r?\n/).find((line) => line.startsWith("# "));
  return heading ? heading.replace(/^#\s+/, "").trim() : null;
}

async function readJson(target) {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch {
    return null;
  }
}

function dependencyNames(packageJson) {
  if (!packageJson) return [];
  return [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {})
  ];
}

function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) return workspaces.filter(Boolean);
  if (Array.isArray(workspaces?.packages)) return workspaces.packages.filter(Boolean);
  return [];
}

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return [value];
  return [];
}

function normalizeRelPath(inputPath) {
  return String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}


