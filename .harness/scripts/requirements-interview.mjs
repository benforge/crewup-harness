import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));

if (!runId) {
  console.error("请提供 runId，例如：npm run harness:requirements-interview -- <run-id> --start");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const inputPath = path.join(runDir, "input.md");
const artifactsDir = path.join(runDir, "artifacts");
const tasksDir = path.join(runDir, "tasks");
const logsDir = path.join(runDir, "logs", "requirements-interview");
const statePath = path.join(logsDir, "state.json");
const artifactPath = path.join(artifactsDir, "requirement-interview.md");
const planPath = path.join(artifactsDir, "requirement-plan.md");

if (!existsSync(inputPath)) {
  console.error(`缺少 run 输入：${path.relative(root, inputPath)}`);
  process.exit(1);
}

await mkdir(artifactsDir, { recursive: true });
await mkdir(tasksDir, { recursive: true });
await mkdir(logsDir, { recursive: true });

const config = parseYaml(await readFile(path.join(root, ".harness", "config", "requirements-planning.yaml"), "utf8")).requirements_planning;
const interviewConfig = config.interactive ?? {};
const input = await readFile(inputPath, "utf8");
const state = await loadState();

const shouldStart = args.includes("--start") || state.rounds.length === 0;
const questionsArg = valueOf("--questions=");
const answerArg = valueOf("--answer=");
const questionArg = valueOf("--question=") ?? "next";
const assumptionArg = valueOf("--assumption=");
const noteArg = valueOf("--note=");
const statusArg = valueOf("--status=");
const syncPlan = args.includes("--sync-plan");
const force = args.includes("--force");

if (shouldStart && state.rounds.length === 0) {
  addRound(state, generateQuestions(input, state));
}

if (questionsArg) {
  addRound(state, splitList(questionsArg));
}

if (answerArg) {
  addAnswer(state, questionArg, answerArg);
}

if (assumptionArg) state.assumptions.push({ text: assumptionArg, at: now() });
if (noteArg) state.notes.push({ text: noteArg, at: now() });

if (statusArg) {
  if (!["collecting", "ready", "blocked"].includes(statusArg)) {
    fail("无效 --status。可用值：collecting、ready、blocked。");
  }
  state.status = statusArg;
}
if (args.includes("--ready")) state.status = "ready";
if (args.includes("--blocked")) state.status = "blocked";

state.updatedAt = now();
state.convergence = assessConvergence(state, interviewConfig);

await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
await writeFile(artifactPath, renderArtifact(state, input), "utf8");
await writeFile(path.join(tasksDir, "requirements-interview.task.md"), renderTask(state), "utf8");

if (syncPlan) {
  await syncInterviewToPlan(state, { force });
}

printStatus(state);

async function loadState() {
  if (existsSync(statePath)) return JSON.parse(await readFile(statePath, "utf8"));
  return {
    runId,
    status: "collecting",
    createdAt: now(),
    updatedAt: now(),
    maxRounds: interviewConfig.max_rounds ?? 3,
    maxQuestionsPerRound: interviewConfig.max_questions_per_round ?? 3,
    rounds: [],
    assumptions: [],
    notes: [],
    convergence: {
      ready: false,
      reason: "not_started"
    }
  };
}

function addRound(current, questions) {
  const maxRounds = current.maxRounds ?? 3;
  if (current.rounds.length >= maxRounds) {
    current.notes.push({ text: `已达到最大问答轮数 ${maxRounds}，后续问题应写入待确认问题。`, at: now() });
    return;
  }
  const limited = questions.map((item) => item.trim()).filter(Boolean).slice(0, current.maxQuestionsPerRound ?? 3);
  if (limited.length === 0) return;
  current.rounds.push({
    round: current.rounds.length + 1,
    questions: limited,
    answers: [],
    createdAt: now()
  });
}

function addAnswer(current, questionSelector, answer) {
  const round = [...current.rounds].reverse().find((item) => item.questions.length > item.answers.length) ?? current.rounds.at(-1);
  if (!round) {
    addRound(current, generateQuestions(input, current));
    return addAnswer(current, questionSelector, answer);
  }

  if (questionSelector === "all") {
    round.answers.push({
      question: "本轮问题合并回答",
      answer,
      answeredAt: now()
    });
    return;
  }

  const index = questionSelector === "next"
    ? nextUnansweredIndex(round)
    : Math.max(0, Number(questionSelector) - 1);
  const question = round.questions[index] ?? round.questions[nextUnansweredIndex(round)] ?? "补充回答";
  round.answers.push({ question, answer, answeredAt: now() });
}

function nextUnansweredIndex(round) {
  return Math.min(round.answers.length, Math.max(0, round.questions.length - 1));
}

function generateQuestions(rawInput, current) {
  const text = rawInput.toLowerCase();
  const answeredText = current.rounds.flatMap((round) => round.answers.map((item) => item.answer)).join("\n").toLowerCase();
  const combined = `${text}\n${answeredText}`;
  const questions = [];

  if (!/(目标|为了|希望|解决|提升|减少|增加|完成)/.test(combined)) {
    questions.push("这个想法最终要解决什么问题，或让谁获得什么价值？");
  }
  if (!/(必须|验收|完成|成功|可以|支持|能够)/.test(combined)) {
    questions.push("最少做到哪 1-3 件事，你就会认为这一版完成了？");
  }
  if (!/(不做|非目标|暂不|不要|边界|排除)/.test(combined)) {
    questions.push("这一版明确不做什么，或有哪些边界不能越过？");
  }
  if (!/(web|admin|api|db|infra|docs|前端|后台|接口|数据库|部署|文档)/i.test(combined)) {
    questions.push("你预期影响范围包含哪些：web、admin、api、db、infra、docs？");
  }
  if (!/(风险|回滚|权限|生产|数据|删除|迁移|安全)/.test(combined)) {
    questions.push("是否涉及权限、真实数据、删除/迁移、生产部署或其他高风险边界？");
  }

  return (questions.length ? questions : [
    "还有哪些业务规则如果不确认，后续实现可能会返工？",
    "是否确认可以把当前理解整理成 requirement-plan.md？"
  ]).slice(0, current.maxQuestionsPerRound ?? 3);
}

function assessConvergence(current, cfg) {
  const answeredCount = current.rounds.reduce((sum, round) => sum + round.answers.length, 0);
  const reachedMaxRounds = current.rounds.length >= (current.maxRounds ?? cfg.max_rounds ?? 3);
  const hasGoal = hasSignal(/(目标|为了|希望|解决|提升|减少|增加|完成)/);
  const hasAcceptance = hasSignal(/(必须|验收|完成|成功|可以|支持|能够|AC-\d+)/i);
  const hasBoundary = hasSignal(/(不做|非目标|暂不|不要|边界|排除|风险|权限|生产|数据|删除|迁移|安全)/);
  const ready = current.status === "ready" || (answeredCount >= 2 && hasGoal && hasAcceptance && hasBoundary);
  return {
    ready,
    answeredCount,
    reachedMaxRounds,
    reason: ready ? "enough_information_for_requirement_plan" : reachedMaxRounds ? "max_rounds_reached_with_open_questions" : "need_more_clarification"
  };

  function hasSignal(pattern) {
    const corpus = [
      input,
      ...current.rounds.flatMap((round) => round.answers.map((item) => item.answer)),
      ...current.assumptions.map((item) => item.text)
    ].join("\n");
    return pattern.test(corpus);
  }
}

function renderArtifact(current, rawInput) {
  const openQuestions = current.rounds.at(-1)?.questions.filter((question) => {
    const answered = current.rounds.at(-1)?.answers.some((item) => item.question === question || item.question === "本轮问题合并回答");
    return !answered;
  }) ?? [];
  const answered = current.rounds.flatMap((round) => round.answers.map((item) => ({ ...item, round: round.round })));
  const understanding = buildUnderstanding(current, rawInput);
  return `# 需求访谈记录

> 这是 requirements_plan 阶段的交互式问答记录。它用于把模糊想法逐轮扩散、澄清和收敛；确认后再同步到 \`requirement-plan.md\`。

## 状态

- status: ${current.status}
- max_rounds: ${current.maxRounds}
- max_questions_per_round: ${current.maxQuestionsPerRound}
- convergence_ready: ${current.convergence.ready ? "yes" : "no"}
- convergence_reason: ${current.convergence.reason}

## 当前理解

${understanding.map((item) => `- ${item}`).join("\n") || "- 暂无"}

## 本轮问题

${openQuestions.length ? openQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n") : "1. 暂无未回答问题。"}

## 已回答问题

${answered.length ? answered.map((item) => `- R${item.round}｜Q：${item.question}\n  A：${item.answer}`).join("\n") : "- 暂无"}

## 待确认假设

${current.assumptions.length ? current.assumptions.map((item) => `- ${item.text}`).join("\n") : "- 暂无"}

## 收敛判断

- [${current.convergence.ready ? "x" : " "}] 已可形成可确认需求草案
- [${!current.convergence.ready && current.status !== "blocked" ? "x" : " "}] 仍需继续澄清
- [${current.status === "blocked" ? "x" : " "}] 因关键问题缺失而阻塞

## 下一步

${nextStep(current)}
`;
}

function buildUnderstanding(current, rawInput) {
  const items = [`原始想法：${firstUsefulLine(rawInput)}`];
  const latestAnswers = current.rounds.flatMap((round) => round.answers).slice(-3);
  for (const answer of latestAnswers) {
    items.push(`${answer.question} -> ${answer.answer}`);
  }
  return items;
}

function nextStep(current) {
  if (current.status === "blocked") return "- 先补齐阻塞问题，再继续 requirements_plan。";
  if (current.convergence.ready) return "- 可以运行 `npm run harness:requirements-interview -- <run-id> --sync-plan` 同步到 requirement-plan.md，然后请用户确认。";
  if (current.convergence.reachedMaxRounds) return "- 已达到最大轮数；把剩余问题写入待确认问题，并由用户决定是否继续。";
  return "- 继续询问本轮问题；用户回答后用 `--answer` 记录。";
}

function renderTask(current) {
  return `# 原生子 agent 任务：requirements-interview

## Run 信息

- runId: ${runId}
- agent: requirements-interview
- stage: requirements_plan

## 输入

- .harness/runs/${runId}/input.md
- .harness/runs/${runId}/artifacts/requirement-interview.md
- .harness/runs/${runId}/artifacts/requirement-plan.md
- .harness/agents/requirements.md
- .harness/config/requirements-planning.yaml

## 职责范围

执行一轮短交互式需求访谈。每轮最多问 ${current.maxQuestionsPerRound} 个问题；除非用户明确要求继续，否则最多 ${current.maxRounds} 轮后停止。

## 允许修改范围

- .harness/runs/${runId}/artifacts/requirement-interview.md
- .harness/runs/${runId}/artifacts/requirement-plan.md

## 禁止事项

- 业务代码变更
- 架构决策
- 实现任务执行

## 完成检查清单

- [ ] 只提出高价值澄清问题
- [ ] 已把回答记录到 requirement-interview.md
- [ ] 已标记收敛状态或阻塞点
- [ ] 在信息足够时，已把简洁摘要同步到 requirement-plan.md
`;
}

async function syncInterviewToPlan(current, { force: allowOverwrite }) {
  const templatePath = path.join(root, ".harness", "templates", "requirement-plan.md");
  const template = existsSync(templatePath) ? await readFile(templatePath, "utf8") : "# 需求扩写草案\n";
  const existing = existsSync(planPath) ? await readFile(planPath, "utf8") : `${template.trim()}\n\n## 原始需求\n\n${input.trim()}\n`;
  const section = renderPlanSection(current);
  const next = upsertSection(existing, "交互式问答摘要", section);
  if (!allowOverwrite && existing.includes("## 交互式问答摘要") && next === existing) return;
  await writeFile(planPath, next, "utf8");
}

function renderPlanSection(current) {
  const answered = current.rounds.flatMap((round) => round.answers.map((item) => `- R${round.round}｜${item.question}：${item.answer}`));
  return [
    "## 交互式问答摘要",
    "",
    `- 状态：${current.status}`,
    `- 收敛：${current.convergence.ready ? "已可整理需求草案" : "仍需澄清"}`,
    `- 收敛原因：${current.convergence.reason}`,
    "",
    "### 已确认信息",
    "",
    answered.length ? answered.join("\n") : "- 暂无",
    "",
    "### 待确认假设",
    "",
    current.assumptions.length ? current.assumptions.map((item) => `- ${item.text}`).join("\n") : "- 暂无",
    ""
  ].join("\n");
}

function upsertSection(markdown, heading, replacement) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
  const match = pattern.exec(markdown);
  if (!match) return `${markdown.trim()}\n\n${replacement.trim()}\n`;
  const start = match.index;
  const rest = markdown.slice(start + match[0].length);
  const next = /^##\s+/m.exec(rest);
  const end = next ? start + match[0].length + next.index : markdown.length;
  return `${markdown.slice(0, start).trimEnd()}\n\n${replacement.trim()}\n\n${markdown.slice(end).trimStart()}`.trimEnd() + "\n";
}

function splitList(value) {
  return value.split(/\|\||\n/).map((item) => item.trim()).filter(Boolean);
}

function valueOf(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function firstUsefulLine(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith("#")) ?? "（空）";
}

function printStatus(current) {
  console.log(`需求访谈：${runId}`);
  console.log(`- status: ${current.status}`);
  console.log(`- rounds: ${current.rounds.length}/${current.maxRounds}`);
  console.log(`- convergence: ${current.convergence.ready ? "ready" : current.convergence.reason}`);
  console.log(`- artifact: ${rel(artifactPath)}`);
  const open = current.rounds.at(-1)?.questions.filter((question) => {
    const answered = current.rounds.at(-1)?.answers.some((item) => item.question === question || item.question === "本轮问题合并回答");
    return !answered;
  }) ?? [];
  if (open.length > 0) {
    console.log("未回答问题：");
    open.forEach((question, index) => console.log(`${index + 1}. ${question}`));
  }
  if (syncPlan) console.log(`- synced: ${rel(planPath)}`);
}

function rel(target) {
  return path.relative(root, target).replaceAll("\\", "/");
}

function now() {
  return new Date().toISOString();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
