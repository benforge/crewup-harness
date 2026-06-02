import { mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { semanticSlugFromText, semanticTitleFromText } from "./lib/naming.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const queue = valueOf("--queue=") ?? "new";
const text = valueOf("--text=");
const title = valueOf("--title=") ?? semanticTitleFromText(text) ?? "未命名任务";
const backlogRoot = path.join(root, ".harness", "backlog");
const queues = ["new", "ready", "in-progress", "review", "done"];

if (!queues.includes(queue)) {
  console.error("无效队列。可选值：new, ready, in-progress, review, done");
  process.exit(1);
}

if (!text?.trim()) {
  console.error("请提供 --text=<request>");
  process.exit(1);
}

const dir = path.join(backlogRoot, queue);
await mkdir(dir, { recursive: true });

const slug = semanticSlugFromText(text, title);
const sequence = await nextBacklogSequence();
const fileName = uniqueName(dir, `${formatSequence(sequence)}-${slug}.md`);
const target = path.join(dir, fileName);
const now = new Date().toISOString();

await writeFile(target, `# ${title}

- backlogId: ${formatSequence(sequence)}
- createdAt: ${now}
- queue: ${queue}
- intake_policy: .harness/config/intake-policy.yaml

## 原始需求

${text.trim()}
`, "utf8");

console.log(path.relative(root, target).replaceAll("\\", "/"));

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function nextBacklogSequence() {
  let max = 0;
  for (const item of await listBacklogFiles()) {
    const match = /^(\d+)-/.exec(item.name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

async function listBacklogFiles() {
  const files = [];
  for (const item of queues) {
    const target = path.join(backlogRoot, item);
    const entries = await readdir(target, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) files.push({ queue: item, name: entry.name });
    }
  }
  return files;
}

function formatSequence(sequence) {
  return String(sequence).padStart(3, "0");
}

function uniqueName(dir, baseName) {
  const parsed = path.parse(baseName);
  let candidate = baseName;
  let index = 2;
  while (existsSync(path.join(dir, candidate))) {
    candidate = `${parsed.name}-${index}${parsed.ext}`;
    index += 1;
  }
  return candidate;
}
