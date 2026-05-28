import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const args = process.argv.slice(2);
const textArg = args.find((arg) => arg.startsWith("--text="));
const fileArg = args.find((arg) => arg.startsWith("--file="));
const runArg = args.find((arg) => arg.startsWith("--run="));
const noWrite = args.includes("--no-write");

const input = await resolveInput();
if (!input.trim()) {
  console.error("Please provide --text=<request> or --file=<path>");
  process.exit(1);
}

const configPath = path.join(root, ".harness", "config", "intake-policy.yaml");
const policy = parseYaml(await readFile(configPath, "utf8")).intake_policy;
const decision = decide(input, policy, runArg?.replace("--run=", ""));

if (!noWrite && policy.write_decision_log) {
  const reportPath = path.join(root, policy.decision_log);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderMarkdown(decision, input), "utf8");
}

console.log(JSON.stringify(decision, null, 2));

async function resolveInput() {
  if (textArg) return textArg.slice("--text=".length);
  if (!fileArg) return "";
  const target = path.resolve(root, fileArg.slice("--file=".length));
  if (!existsSync(target)) {
    console.error(`Input file not found: ${path.relative(root, target)}`);
    process.exit(1);
  }
  return readFile(target, "utf8");
}

function decide(text, policy, explicitRunId) {
  const normalized = text.toLowerCase();
  const reasons = [];

  if (explicitRunId || hasAny(text, policy.explicit_overrides.force_direct_run.phrases)) {
    reasons.push(explicitRunId ? `explicit run: ${explicitRunId}` : "user explicitly asked to start or continue execution");
    return build("direct_run", reasons, policy, explicitRunId);
  }

  if (hasAny(text, policy.explicit_overrides.force_no_harness.phrases)) {
    reasons.push("user explicitly asked to avoid harness or only answer");
    return build("no_harness", reasons, policy, explicitRunId);
  }

  if (hasAny(text, policy.explicit_overrides.force_backlog.phrases)) {
    reasons.push("user explicitly asked to record for later or backlog");
    return build("backlog_new", reasons, policy, explicitRunId);
  }

  if (/[?？]$/.test(text.trim()) || /(是什么|为什么|怎么理解|区别|解释|说明一下|怎么看)/.test(text)) {
    reasons.push("request looks like explanation or conceptual Q&A");
    return build("no_harness", reasons, policy, explicitRunId);
  }

  if (/(想法|可能|以后|待办|先记|有几个|几个方向|脑暴|brainstorm|maybe|later)/i.test(text)) {
    reasons.push("request looks like an idea or future candidate");
    return build("backlog_new", reasons, policy, explicitRunId);
  }

  const asksImplementation = /(实现|开发|修复|优化|改造|完善|调整|升级|改一下|加一个|build|implement|fix|create|refactor)/i.test(text);
  const hasConcreteScope = /(harness|工作流|脚本|配置|页面|组件|接口|api|数据库|迁移|测试|样式|按钮|登录|权限|run|文件|\.md|\.tsx|\.ts|\.js|\.mjs|\.yaml)/i.test(text);
  if (asksImplementation && hasConcreteScope) {
    reasons.push("request asks for implementation with concrete scope");
    reasons.push("direct run is allowed because the user appears to be asking for work now");
    return build("direct_run", reasons, policy, explicitRunId);
  }

  if (/(需求|功能|产品|用户|验收|流程)/.test(text) && !asksImplementation) {
    reasons.push("request is product/requirement oriented but not an explicit start signal");
    return build("backlog_new", reasons, policy, explicitRunId);
  }

  reasons.push(`fallback to policy default: ${policy.default_entry}`);
  return build(policy.default_entry, reasons, policy, explicitRunId);
}

function build(entry, reasons, policy, explicitRunId) {
  const target = policy.entries[entry];
  return {
    entry,
    action: actionFor(entry),
    explicitRunId: explicitRunId || null,
    reason: reasons,
    description: target?.description ?? "",
    next_step: target?.next_step ?? "",
    generatedAt: new Date().toISOString()
  };
}

function actionFor(entry) {
  return {
    backlog_new: "create_or_update_backlog_new",
    backlog_ready: "create_or_update_backlog_ready",
    direct_run: "create_or_select_run",
    no_harness: "answer_or_lightweight_edit"
  }[entry] ?? "unknown";
}

function hasAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function renderMarkdown(decision, input) {
  return `# Intake Decision

- entry: ${decision.entry}
- action: ${decision.action}
- generatedAt: ${decision.generatedAt}

## Reason

${decision.reason.map((item) => `- ${item}`).join("\n")}

## Next Step

${decision.next_step}

## Request

${input.trim()}
`;
}
