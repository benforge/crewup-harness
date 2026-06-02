import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { leadingSequence, semanticSlugFromText, stripLeadingSequence } from "./lib/naming.mjs";

const root = process.cwd();
const arg = process.argv[2];

if (!arg) {
  console.error("请提供 ready 队列文件名，例如：npm run harness:new-run -- 001-xxx.md");
  console.error("如果你是从原始需求开始，请先运行：npm run harness:intake -- --text=\"<request>\"");
  process.exit(1);
}

const readyFile = path.join(root, ".harness", "backlog", "ready", arg);

if (!existsSync(readyFile)) {
  console.error(`未找到 ready backlog 项：${path.relative(root, readyFile)}`);
  console.error("new-run 只会从 .harness/backlog/ready/ 创建 run。");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const baseName = path.basename(arg, path.extname(arg)).toLowerCase();
const input = await readFile(readyFile, "utf8");
const sequence = leadingSequence(baseName);
const semanticName = semanticSlugFromText(input, stripLeadingSequence(baseName));
const safeName = [sequence, semanticName].filter(Boolean).join("-");
const runId = `${today}-${safeName}`;
const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");
const initialStage = "requirements_plan";

if (existsSync(runDir)) {
  console.error(`Run 已存在：${path.relative(root, runDir)}`);
  process.exit(1);
}

await mkdir(artifactsDir, { recursive: true });
await mkdir(logsDir, { recursive: true });
await copyFile(readyFile, path.join(runDir, "input.md"));

const now = new Date().toISOString();
const state = {
  runId,
  sourceRequirement: path.relative(root, readyFile).replaceAll("\\", "/"),
  stage: initialStage,
  status: "in-progress",
  workflowProfile: "standard",
  runType: "feature",
  owners: ["requirements-plan"],
  createdAt: now,
  updatedAt: now,
  confirmations: {},
  transitions: [
    {
      from: "intake",
      to: initialStage,
      at: now,
      reason: "run_created_from_backlog_ready"
    }
  ],
  intake: {
    source: "backlog_ready",
    policy: ".harness/config/intake-policy.yaml"
  },
  git: gitBaseline()
};

await writeFile(path.join(runDir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");

await writeFile(path.join(artifactsDir, ".gitkeep"), "", "utf8");

await writeFile(
  path.join(logsDir, "created.md"),
  `# Run 创建记录

- runId: ${runId}
- source: ${path.relative(root, readyFile).replaceAll("\\", "/")}
- createdAt: ${now}
- intake: backlog_ready

## 原始需求快照

${input}
`,
  "utf8"
);

console.log(`Created run: ${path.relative(root, runDir)}`);

function gitBaseline() {
  const inside = git(["rev-parse", "--is-inside-work-tree"], { fail: false });
  if (inside.status !== 0 || inside.stdout.trim() !== "true") {
    return {
      available: false,
      baselineHead: null,
      dirtyAtStart: null,
      capturedAt: new Date().toISOString()
    };
  }
  const head = git(["rev-parse", "--short", "HEAD"], { fail: false });
  const status = git(["status", "--short"], { fail: false });
  const dirty = status.stdout.trim().split(/\r?\n/).filter(Boolean);
  return {
    available: true,
    baselineHead: head.status === 0 ? head.stdout.trim() : null,
    dirtyAtStart: dirty,
    capturedAt: new Date().toISOString()
  };
}

function git(args, { fail = true } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8"
  });
  if (fail && result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(" ")} failed`);
  }
  return result;
}
