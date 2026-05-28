import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const arg = process.argv[2];

if (!arg) {
  console.error("Please provide a backlog/ready task file name, for example: npm run harness:new-run -- 001-blog-mvp.md");
  console.error("Run intake first when starting from a raw user request: npm run harness:intake -- --text=\"<request>\"");
  process.exit(1);
}

const readyFile = path.join(root, ".harness", "backlog", "ready", arg);

if (!existsSync(readyFile)) {
  console.error(`Ready backlog item not found: ${path.relative(root, readyFile)}`);
  console.error("new-run only creates runs from .harness/backlog/ready/. Use harness:intake before creating a run.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const baseName = path.basename(arg, path.extname(arg)).toLowerCase();
const safeName = baseName
  .replace(/[^a-z0-9\u4e00-\u9fa5-]+/gi, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");
const runId = `${today}-${safeName}`;
const runDir = path.join(root, ".harness", "runs", runId);
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");
const initialStage = "requirements_plan";

if (existsSync(runDir)) {
  console.error(`Run already exists: ${path.relative(root, runDir)}`);
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

const templates = [
  "requirement-plan.md",
  "requirement.md",
  "architecture.md",
  "implementation-plan.md",
  "api-change.md",
  "db-migration.md",
  "review-report.md",
  "release-summary.md"
];

for (const name of templates) {
  const source = path.join(root, ".harness", "templates", name);
  const target = path.join(artifactsDir, name);
  if (existsSync(source)) await copyFile(source, target);
}

const testReport = `# 测试报告\n\n## Run\n\n- runId: ${runId}\n\n## 结果汇总\n\n待 Tester Agent 补充。\n\n## 执行项\n\n-\n\n## 通过项\n\n-\n\n## 失败 / 阻塞项\n\n-\n\n## 未覆盖风险\n\n-\n`;
await writeFile(path.join(artifactsDir, "test-report.md"), testReport, "utf8");

const input = await readFile(readyFile, "utf8");
await writeFile(
  path.join(logsDir, "created.md"),
  `# Run 创建记录\n\n- runId: ${runId}\n- source: ${path.relative(root, readyFile).replaceAll("\\", "/")}\n- createdAt: ${now}\n- intake: backlog_ready\n\n## 原始需求快照\n\n${input}\n`,
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
