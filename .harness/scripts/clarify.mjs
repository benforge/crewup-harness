import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const root = process.cwd();
const args = process.argv.slice(2);
const runId = args.find((arg) => !arg.startsWith("--"));
const json = args.includes("--json");
const interactive = args.includes("--interactive") || args.includes("-i");
const answersArg = valueOf("--answers=");

if (!runId) {
  console.error("Usage: crewup clarify <run-id> [--json] [--interactive] [--answers=\"Q-01:A;Q-02:A,C\"]");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const resultPath = path.join(runDir, "logs", "native-subagents", "requirements-plan.result.json");
const requirementPlanPath = path.join(runDir, "artifacts", "requirement-plan.md");
const answersDir = path.join(runDir, "logs", "clarifications");
const answersJsonPath = path.join(answersDir, "answers.json");
const answersMdPath = path.join(answersDir, "answers.md");

if (!existsSync(resultPath)) {
  console.error(`Missing requirements-plan result JSON: ${path.relative(root, resultPath).replaceAll("\\", "/")}`);
  console.error("Run requirements-plan first. If it needs user input, it must write clarificationQuestions.");
  process.exit(1);
}

const result = JSON.parse((await readFile(resultPath, "utf8")).replace(/^\uFEFF/, ""));
const questions = Array.isArray(result.clarificationQuestions) ? result.clarificationQuestions : [];

if (json) {
  console.log(JSON.stringify({ runId, questions }, null, 2));
  process.exit(0);
}

if (!questions.length) {
  console.log("No clarification questions recorded.");
  process.exit(0);
}

if (answersArg) {
  const answers = parseAnswersArg(answersArg, questions);
  await saveAnswers(answers, "answers-arg");
  console.log(`Clarification answers saved: ${path.relative(root, answersJsonPath).replaceAll("\\", "/")}`);
  process.exit(0);
}

if (interactive) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("Interactive clarify requires a TTY. Falling back to text rendering.");
    console.log(renderQuestions(questions));
    process.exit(1);
  }
  const answers = await runInteractive(questions);
  await saveAnswers(answers, "interactive-cli");
  console.log(`\nClarification answers saved: ${path.relative(root, answersJsonPath).replaceAll("\\", "/")}`);
  process.exit(0);
}

console.log(renderQuestions(questions));

function renderQuestions(items) {
  const card = readClarificationCardSync();
  const lines = [
    `# Clarification Questions: ${runId}`,
    "",
    "请先确认下面的需求确认卡和问题，再继续生成正式需求产物。",
    ""
  ];
  if (card) {
    lines.push(card, "");
  }

  for (const question of items) {
    lines.push(`## ${question.id ?? "Q"} ${question.question ?? ""}`.trim(), "");
    lines.push(`- type: ${question.type ?? "free_text"}`);
    if (question.required !== undefined) lines.push(`- required: ${question.required ? "true" : "false"}`);
    const recommended = Array.isArray(question.recommendedOptionIds)
      ? question.recommendedOptionIds.join(", ")
      : question.recommendedOptionIds;
    if (recommended) lines.push(`- recommended: ${recommended}`);
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length) {
      lines.push("", "Options:");
      for (const option of options) {
        const description = option.description ? ` - ${option.description}` : "";
        lines.push(`- ${option.id ?? "-"}: ${option.label ?? ""}${description}`);
      }
    }
    lines.push("");
  }

  lines.push("回答格式示例：", "", "```text", "Q-01: A", "Q-02: A, C", "Q-03: 你的补充说明", "```", "");
  lines.push(`也可以运行：npx crewup clarify ${runId} --interactive`);
  return lines.join("\n").trimEnd();
}

function readClarificationCardSync() {
  if (!existsSync(requirementPlanPath)) return "";
  const text = String(readFileSync(requirementPlanPath, "utf8")).replace(/^\uFEFF/, "");
  const match = text.match(/^## Clarification Card\s*\n([\s\S]*?)(?=\n## |\s*$)/m);
  return match ? `## Clarification Card\n${match[1].trimEnd()}` : "";
}

async function runInteractive(items) {
  const answers = [];
  console.log(`Clarification Questions: ${runId}`);
  console.log("使用方向键上下移动，多选题用空格切换，回车确认。\n");
  for (const question of items) {
    const type = question.type ?? "free_text";
    if (type === "free_text") {
      const value = await askText(`${question.id} ${question.question}\n> `);
      answers.push(answerRecord(question, [value], value));
      continue;
    }
    const options = Array.isArray(question.options) ? question.options : [];
    if (!options.length) {
      const value = await askText(`${question.id} ${question.question}\n> `);
      answers.push(answerRecord(question, [value], value));
      continue;
    }
    const selected = await chooseOptions(question, options, type === "multi_choice");
    answers.push(answerRecord(question, selected.map((item) => item.id), selected.map((item) => item.label).join(", ")));
  }
  return answers;
}

function chooseOptions(question, options, multi) {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    let index = Math.max(0, options.findIndex((item) => (question.recommendedOptionIds ?? []).includes(item.id)));
    const selected = new Set(multi ? asArray(question.recommendedOptionIds) : []);

    const render = () => {
      process.stdout.write("\x1Bc");
      console.log(`${question.id} ${question.question}`);
      console.log(multi ? "空格切换选中，回车确认。\n" : "方向键上下移动，回车确认。\n");
      for (let itemIndex = 0; itemIndex < options.length; itemIndex += 1) {
        const option = options[itemIndex];
        const cursor = itemIndex === index ? ">" : " ";
        const mark = multi ? (selected.has(option.id) ? "[x]" : "[ ]") : (itemIndex === index ? "(*)" : "( )");
        const description = option.description ? ` - ${option.description}` : "";
        console.log(`${cursor} ${mark} ${option.id}: ${option.label}${description}`);
      }
    };

    const done = () => {
      process.stdin.off("keypress", onKey);
      process.stdin.setRawMode(wasRaw);
      const answerIds = multi
        ? [...selected]
        : [options[index]?.id].filter(Boolean);
      resolve(options.filter((item) => answerIds.includes(item.id)));
    };

    const onKey = (_str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.setRawMode(wasRaw);
        process.exit(130);
      }
      if (key?.name === "up") index = (index - 1 + options.length) % options.length;
      if (key?.name === "down") index = (index + 1) % options.length;
      if (multi && key?.name === "space") {
        const id = options[index]?.id;
        if (id) selected.has(id) ? selected.delete(id) : selected.add(id);
      }
      if (key?.name === "return") return done();
      render();
    };

    process.stdin.on("keypress", onKey);
    render();
  });
}

function askText(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function saveAnswers(answers, source) {
  const payload = {
    runId,
    source,
    recordedAt: new Date().toISOString(),
    resultPath: path.relative(root, resultPath).replaceAll("\\", "/"),
    answers
  };
  await mkdir(answersDir, { recursive: true });
  await writeFile(answersJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(answersMdPath, renderAnswersMarkdown(payload), "utf8");
}

function renderAnswersMarkdown(payload) {
  const lines = [
    "# Clarification Answers",
    "",
    `- runId: ${payload.runId}`,
    `- source: ${payload.source}`,
    `- recordedAt: ${payload.recordedAt}`,
    "",
    "## Answers",
    ""
  ];
  for (const answer of payload.answers) {
    lines.push(`### ${answer.id}`, "", `- question: ${answer.question}`, `- answerIds: ${answer.answerIds.join(", ") || "(none)"}`, `- answerText: ${answer.answerText || "(empty)"}`, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function parseAnswersArg(value, items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return String(value ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [idPart, answerPart = ""] = part.split(/[:=]/);
      const question = byId.get(idPart.trim()) ?? { id: idPart.trim(), question: "" };
      const answerIds = answerPart.split(",").map((item) => item.trim()).filter(Boolean);
      return answerRecord(question, answerIds, answerIds.join(", "));
    });
}

function answerRecord(question, answerIds, answerText) {
  return {
    id: question.id,
    question: question.question ?? "",
    type: question.type ?? "free_text",
    answerIds,
    answerText
  };
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function valueOf(prefix) {
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}
