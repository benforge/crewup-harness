import { readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const harnessRoot = path.resolve(root, ".harness");
const runsRoot = path.join(harnessRoot, "runs");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const includeCurrent = args.includes("--include-current");
const currentRun = valueOf("--current-run=");

const targets = [];

await collectRunCaches();

let totalBytes = 0;
for (const target of targets) totalBytes += target.bytes;

if (!apply) {
  printSummary("预览");
  console.log("");
  console.log("未删除任何文件。确认无误后运行：npm run harness:cleanup -- --apply");
  process.exit(0);
}

const removed = [];
const skipped = [];
for (const target of targets) {
  try {
    await assertInsideHarness(target.path);
    await rm(target.path, { recursive: true, force: true });
    removed.push(target);
  } catch (error) {
    skipped.push({ ...target, error: error?.code ?? error?.message ?? String(error) });
  }
}

printSummary("已尝试清理", removed);
if (skipped.length) {
  const skippedBytes = skipped.reduce((sum, item) => sum + item.bytes, 0);
  console.log("");
  console.log(`跳过 ${skipped.length} 个目标，合计 ${formatBytes(skippedBytes)}。通常是文件被 dev server 或编辑器占用。`);
  for (const item of skipped) console.log(`- ${formatBytes(item.bytes).padStart(9)} ${rel(item.path)}｜${item.error}`);
}

async function collectRunCaches() {
  if (!existsSync(runsRoot)) return;
  const runs = await readdir(runsRoot, { withFileTypes: true });
  for (const run of runs.filter((item) => item.isDirectory())) {
    if (!includeCurrent && currentRun && run.name === currentRun) continue;
    const runDir = path.join(runsRoot, run.name);

    await addDirectory(path.join(runDir, "logs", "context"), "context-pack 缓存，可重新生成");
    await addFiles(path.join(runDir, "logs", "desktop-agents"), (name) => name.endsWith(".prompt.md") || name === "desktop-execution-plan.md", "desktop prompt 缓存，可重新生成");
    await addFiles(path.join(runDir, "logs", "native-subagents"), (name) => name.endsWith(".spawn.md") || name === "native-subagent-plan.md" || name === "native-subagent-plan.json", "native 计划/prompt 缓存，可重新生成");
    await addFilesRecursive(path.join(runDir, "logs", "dev-servers"), () => true, "开发服务日志，不参与闭环证据");
  }
}

async function addDirectory(target, reason) {
  if (!existsSync(target)) return;
  const bytes = await sizeOf(target);
  if (bytes === 0) return;
  targets.push({ path: target, bytes, reason });
}

async function addFiles(dir, predicate, reason) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !predicate(entry.name)) continue;
    const target = path.join(dir, entry.name);
    targets.push({ path: target, bytes: (await stat(target)).size, reason });
  }
}

async function addFilesRecursive(dir, predicate, reason) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await addFilesRecursive(target, predicate, reason);
      continue;
    }
    if (!entry.isFile() || !predicate(entry.name)) continue;
    targets.push({ path: target, bytes: (await stat(target)).size, reason });
  }
}

async function sizeOf(target) {
  const info = await stat(target);
  if (info.isFile()) return info.size;
  const entries = await readdir(target, { withFileTypes: true }).catch(() => []);
  let total = 0;
  for (const entry of entries) total += await sizeOf(path.join(target, entry.name));
  return total;
}

async function assertInsideHarness(target) {
  const resolved = path.resolve(target);
  if (resolved !== harnessRoot && !resolved.startsWith(`${harnessRoot}${path.sep}`)) {
    throw new Error(`拒绝清理 .harness 外部路径：${resolved}`);
  }
}

function printSummary(label, items = targets) {
  const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
  console.log(`${label} ${items.length} 个缓存目标，合计 ${formatBytes(bytes)}。`);
  for (const target of items.sort((left, right) => right.bytes - left.bytes)) {
    console.log(`- ${formatBytes(target.bytes).padStart(9)} ${rel(target.path)}｜${target.reason}`);
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
