import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { modeLabel } from "./workflow-modes.mjs";

export const finalStatuses = new Set(["done", "canceled", "failed"]);

export function normalizeRunState(state = {}) {
  const status = state.status ?? "active";
  const outcome = state.outcome ?? (status === "done" ? "success" : "none");
  const normalized = {
    ...state,
    status,
    outcome,
    archived: Boolean(state.archived),
    health: state.health ?? healthForStatus(status, outcome)
  };
  return {
    ...normalized,
    nextAction: state.nextAction ?? nextActionForState(normalized)
  };
}

export function healthForStatus(status, outcome = "none", reason = "") {
  if (status === "blocked" || outcome === "blocked") return { level: "blocked", reason };
  if (status === "failed" || outcome === "failed") return { level: "failed", reason };
  if (status === "partial" || outcome === "partial") return { level: "warning", reason };
  return { level: "ok", reason };
}

export function nextActionForState(state = {}) {
  if (state.status === "waiting_user") {
    return {
      type: "user",
      description: "Review and answer the clarification card or requested approval.",
      command: state.runId ? `npx crewup clarify ${state.runId} --interactive` : ""
    };
  }
  if (state.status === "blocked") {
    return { type: "blocked", description: state.reason ?? state.health?.reason ?? "Run is blocked.", command: "" };
  }
  if (state.status === "done" && !state.archived) {
    return {
      type: "archive",
      description: "Run reached done; archive closeout is still pending.",
      command: state.runId ? `npx crewup archive ${state.runId} --outcome=success` : ""
    };
  }
  if (state.status === "done" || state.status === "canceled" || state.status === "failed") {
    return { type: "none", description: "No active next action.", command: "" };
  }
  return {
    type: "agent",
    description: "Run the next allowed CrewUp agent or gate command.",
    command: state.runId ? `npx crewup next-agent ${state.runId}` : ""
  };
}

export async function readRunState(root, runId) {
  const statePath = path.join(root, ".harness", "runs", runId, "state.json");
  if (!existsSync(statePath)) return null;
  return normalizeRunState(JSON.parse(await readFile(statePath, "utf8")));
}

export async function writeRunState(root, runId, state) {
  const runDir = path.join(root, ".harness", "runs", runId);
  const normalized = normalizeRunState({ ...state, runId, updatedAt: new Date().toISOString() });
  await writeFile(path.join(runDir, "state.json"), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await writeRunStatus(root, runId, normalized);
  return normalized;
}

export async function writeRunStatus(root, runId, stateArg = null) {
  const runDir = path.join(root, ".harness", "runs", runId);
  const state = normalizeRunState(stateArg ?? JSON.parse(await readFile(path.join(runDir, "state.json"), "utf8")));
  const locale = localeForState(state);
  const text = labelsFor(locale);
  const mode = modeLabel({ profile: state.workflowProfile });
  const artifacts = await existingArtifacts(path.join(runDir, "artifacts"));
  const contract = await readCompletionContract(runDir);
  const blockers = await readBlockers(runDir, state);
  const progress = progressFor({ state, artifacts, runDir });
  const owner = currentOwnerFor(state.stage);
  const nextCommand = state.nextAction?.command || "";
  const completion = completionFor({ state, progress });
  const verdict = verdictForState(state, locale, { contract });
  const lines = [
    text.title,
    "",
    text.atAGlance,
    "",
    `**${text.run}:** \`${runId}\``,
    "",
    `**Mode:** \`${mode}\` / profile \`${state.workflowProfile ?? "unknown"}\``,
    "",
    `**${text.state}:** ${statusBadge(state.status)} / ${text.stageLabel} \`${state.stage ?? "unknown"}\` / ${text.outcomeLabel} \`${state.outcome ?? "none"}\``,
    "",
    `**${text.verdict}:** ${verdict.label} - ${verdict.description}`,
    "",
    `**${text.ownerNow}:** ${owner}`,
    "",
    `**${text.next}:** ${localizedNextDescription(state, locale)}`,
    "",
    nextCommand ? `**${text.command}:** \`${nextCommand}\`` : `**${text.command}:** ${text.none}`,
    "",
    ...userActionLines(state, runId),
    ...(state.status === "waiting_user" ? [""] : []),
    `**${text.done}:** ${completion.done ? text.yes : text.no}${completion.reason ? ` - ${localizeReason(completion.reason, locale)}` : ""}`,
    "",
    `**${text.goal}:** ${contract ? "`GOAL.md` / `completion-contract.json`" : text.notGenerated}`,
    "",
    text.currentDecision,
    "",
    ...decisionLinesFor({ state, blockers, nextCommand, locale }),
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Run | ${runId} |`,
    `| Mode | ${mode} |`,
    `| Workflow Profile | ${state.workflowProfile ?? "unknown"} |`,
    `| Status | ${state.status ?? "unknown"} |`,
    `| Stage | ${state.stage ?? "unknown"} |`,
    `| Outcome | ${state.outcome ?? "none"} |`,
    `| Verdict | ${verdict.label} - ${verdict.description} |`,
    `| Completion Contract | ${contract ? "`GOAL.md`, `completion-contract.json`" : "not generated"} |`,
    `| Health | ${state.health?.level ?? "unknown"}${state.health?.reason ? `: ${state.health.reason}` : ""} |`,
    `| Branch | ${state.git?.branch ?? "(none)"} |`,
    `| Current Owner | ${owner} |`,
    `| Next Action | ${localizedNextDescription(state, locale)} |`,
    `| Next Command | ${nextCommand ? `\`${nextCommand}\`` : "(none)"} |`,
    `| Archived | ${state.archived ? "yes" : "no"} |`,
    "",
    text.progress,
    "",
    ...progress.map((item) => `- [${item.done ? "x" : " "}] ${localizeProgressLabel(item.label, locale)}`),
    "",
    text.blockers,
    "",
    ...(blockers.length ? blockers.map((item) => `- ${item}`) : [`- ${text.none}`]),
    "",
    text.reusableArtifacts,
    "",
    ...(artifacts.length ? artifacts.map((item) => `- artifacts/${item}`) : [`- ${text.none}`]),
    ""
  ];
  await writeFile(path.join(runDir, "RUN_STATUS.md"), `${lines.join("\n")}\n`, "utf8");
}

function userActionLines(state, runId) {
  if (state.status !== "waiting_user") return [];
  return [
    "## ACTION REQUIRED: 需要你回答",
    "",
    "CrewUp 正在等待用户确认，暂时不会继续 requirements/architecture/implementation。",
    "",
    "请使用以下任一方式回答：",
    "",
    `- 查看问题卡：\`npx crewup clarify ${runId}\``,
    `- 终端交互回答：\`npx crewup clarify ${runId} --interactive\``,
    `- 直接提交答案：\`npx crewup clarify ${runId} --answers=\"Q-01:A;Q-02:B\"\``,
    "",
    "回答保存后，主 agent 会恢复 requirements-plan 并继续 CrewUp 流程。"
  ];
}

export async function writeRunSummary(root, runId, { reason = "", archiveOutcome = "" } = {}) {
  const runDir = path.join(root, ".harness", "runs", runId);
  const state = await readRunState(root, runId);
  const artifacts = await existingArtifacts(path.join(runDir, "artifacts"));
  const contract = await readCompletionContract(runDir);
  const blockers = await readBlockers(runDir, state ?? {});
  const locale = localeForState(state ?? {});
  const verdict = verdictForState(state ?? {}, locale, { contract });
  const lines = [
    `# Run Summary: ${runId}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Status | ${state?.status ?? "unknown"} |`,
    `| Stage | ${state?.stage ?? "unknown"} |`,
    `| Outcome | ${archiveOutcome || state?.outcome || "none"} |`,
    `| Verdict | ${verdict.label} - ${verdict.description} |`,
    `| Completion Contract | ${contract ? "GOAL.md, completion-contract.json" : "not generated"} |`,
    `| Archived | ${state?.archived ? "yes" : "no"} |`,
    `| Reason | ${reason || state?.reason || state?.health?.reason || "none"} |`,
    `| Branch | ${state?.git?.branch ?? "(none)"} |`,
    "",
    "## Reusable Artifacts",
    "",
    ...(artifacts.length ? artifacts.map((item) => `- artifacts/${item}`) : ["- none"]),
    "",
    "## Blockers Or Open Issues",
    "",
    ...(blockers.length ? blockers.map((item) => `- ${item}`) : ["- none"]),
    ""
  ];
  await writeFile(path.join(runDir, "RUN_SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");
}

export async function listRuns(root) {
  const runsRoot = path.join(root, ".harness", "runs");
  if (!existsSync(runsRoot)) return [];
  const entries = await readdir(runsRoot, { withFileTypes: true });
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const state = await readRunState(root, entry.name);
    rows.push({ runId: entry.name, state });
  }
  return rows.sort((a, b) => b.runId.localeCompare(a.runId));
}

async function existingArtifacts(artifactsDir) {
  if (!existsSync(artifactsDir)) return [];
  const entries = await readdir(artifactsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name).sort();
}

async function readBlockers(runDir, state) {
  const blockers = [];
  if (state?.reason) blockers.push(state.reason);
  if (state?.health?.reason) blockers.push(state.health.reason);
  const blockerFile = path.join(runDir, "logs", "blockers.md");
  if (existsSync(blockerFile)) {
    const text = await readFile(blockerFile, "utf8").catch(() => "");
    for (const line of text.split(/\r?\n/).filter((item) => /^-\s+\S/.test(item))) blockers.push(line.replace(/^-\s+/, ""));
  }
  return [...new Set(blockers.filter(Boolean))];
}

async function readCompletionContract(runDir) {
  const target = path.join(runDir, "completion-contract.json");
  if (!existsSync(target)) return null;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function progressFor({ state, artifacts, runDir }) {
  const stage = state.stage ?? "";
  const order = ["requirements_plan", "requirements_confirm", "plan", "implement", "verify", "review", "release", "done"];
  const stageIndex = order.indexOf(stage);
  const doneStage = (name) => state.status === "done" || stageIndex > order.indexOf(name);
  return [
    { label: "Run created", done: true },
    { label: "Branch recorded", done: Boolean(state.git?.branch || state.git?.available === false) },
    { label: "Clarification card generated", done: artifacts.includes("requirement-plan.md") },
    { label: "User confirmed requirements", done: doneStage("requirements_plan") },
    { label: "Requirements completed", done: artifacts.includes("requirement.md") },
    { label: "Architecture completed", done: artifacts.includes("architecture.md") && artifacts.includes("implementation-plan.md") },
    { label: "Implementation completed", done: doneStage("implement") },
    { label: "Tester passed", done: artifacts.includes("test-report.md") && doneStage("verify") },
    { label: "Reviewer passed", done: artifacts.includes("review-report.md") && doneStage("review") },
    { label: "Release summary written", done: artifacts.includes("release-summary.md") },
    { label: "Report generated", done: Boolean(state.reportGeneratedAt) || existsSync(path.join(runDir, "logs", "run-report.md")) },
    { label: "Archived", done: Boolean(state.archived) }
  ];
}

function currentOwnerFor(stage) {
  return {
    intake: "main",
    requirements_plan: "requirements-plan",
    requirements_confirm: "requirements",
    plan: "architect",
    implement: "implementation agents",
    verify: "tester",
    review: "reviewer",
    release: "release",
    done: "main"
  }[stage] ?? "unknown";
}

function statusBadge(status) {
  return {
    active: "`active`",
    waiting_user: "`waiting_user`",
    blocked: "`blocked`",
    partial: "`partial`",
    done: "`done`",
    canceled: "`canceled`",
    failed: "`failed`"
  }[status] ?? `\`${status ?? "unknown"}\``;
}

function completionFor({ state, progress }) {
  if (state.status === "done" && state.outcome === "success" && state.archived) return { done: true, reason: "success outcome recorded and archived" };
  if (state.status === "done" && state.outcome === "success") return { done: true, reason: "success outcome recorded; archive pending" };
  if (state.status === "canceled") return { done: false, reason: "canceled outcome" };
  if (state.status === "failed") return { done: false, reason: "failed outcome" };
  if (state.status === "blocked") return { done: false, reason: "blocked" };
  const missing = progress.find((item) => !item.done);
  return { done: false, reason: missing ? `next incomplete step: ${missing.label}` : "not marked success" };
}

function verdictForState(state = {}, locale = "en", { contract = null } = {}) {
  const zh = locale === "zh-CN";
  const status = state.status ?? "unknown";
  const outcome = state.outcome ?? "none";
  const archived = Boolean(state.archived);
  if (status === "done" && outcome === "success" && archived) {
    return zh
      ? { label: "`SUCCESS`", description: "CrewUp 迭代已成功完成并归档" }
      : { label: "`SUCCESS`", description: "CrewUp iteration completed successfully and is archived" };
  }
  if (status === "done" && outcome === "success") {
    return zh
      ? { label: "`READY_TO_ARCHIVE`", description: "已完成，但归档收口仍待执行" }
      : { label: "`READY_TO_ARCHIVE`", description: "completed but archive closeout is still pending" };
  }
  if (status === "partial" || outcome === "partial") {
    const reason = contract
      ? (zh ? "完成契约只被部分满足，或存在工作流外变更" : "the completion contract is only partially satisfied or work happened outside the workflow")
      : (zh ? "部分完成，或存在绕开严格工作流的变更，不算完整成功迭代" : "partially complete or contains work outside the strict workflow; not a successful iteration");
    return { label: "`PARTIAL`", description: reason };
  }
  if (status === "blocked" || outcome === "blocked") {
    return zh
      ? { label: "`BLOCKED`", description: "当前被阻塞，需要先解决阻塞或基于本 run 继续" }
      : { label: "`BLOCKED`", description: "blocked; resolve the blocker or continue from this run" };
  }
  if (status === "failed" || outcome === "failed") {
    return zh
      ? { label: "`FAILED`", description: "本次迭代失败，不能按成功交付使用" }
      : { label: "`FAILED`", description: "failed; do not treat this as successful delivery" };
  }
  if (status === "canceled" || outcome === "canceled") {
    return zh
      ? { label: "`CANCELED`", description: "本次迭代已取消" }
      : { label: "`CANCELED`", description: "iteration was canceled" };
  }
  if (status === "waiting_user") {
    return zh
      ? { label: "`WAITING_USER`", description: "等待用户确认，不算完成" }
      : { label: "`WAITING_USER`", description: "waiting for user input; not complete" };
  }
  return zh
    ? { label: "`IN_PROGRESS`", description: "仍在流程中，不算完成" }
    : { label: "`IN_PROGRESS`", description: "still in progress; not complete" };
}

function decisionLinesFor({ state, blockers, nextCommand, locale = "en" }) {
  const zh = locale === "zh-CN";
  if (state.nextAction?.type === "wait") {
    return zh
      ? [
          "- 当前已有子 agent 正在运行，暂时没有新的 runnable agent。",
          "- 等待该子 agent 写入 result 后，先登记 result，再重新运行 `next-agent`。",
          "- 这不是用户决策点；不要询问用户选择 reviewer 或 repair 分支。"
        ]
      : [
          "- A subagent is currently running; no new agent is runnable yet.",
          "- Wait for that subagent to write its result, capture the result, then rerun `next-agent`.",
          "- This is not a user decision point; do not ask the user to choose reviewer or repair routing."
        ];
  }
  if (state.nextAction?.type === "repair") {
    return zh
      ? [
          "- tester/reviewer 已返回 required fixes，需要回到 owner agent 修复。",
          nextCommand ? `- 先执行：\`${nextCommand}\`。` : "- 先生成 repair-plan。",
          "- 不要启动 reviewer/release，也不要让主 agent 直接修改业务代码。"
        ]
      : [
          "- tester/reviewer returned required fixes; route repair to owner agents.",
          nextCommand ? `- Run first: \`${nextCommand}\`.` : "- Generate a repair plan first.",
          "- Do not start reviewer/release and do not let the main agent patch business code directly."
        ];
  }
  if (state.status === "waiting_user") {
    return zh
      ? [
          "- 正在等待用户确认或选择。",
          nextCommand ? `- 使用 \`${nextCommand}\`，或通过宿主选择界面回答。` : "- 继续前先查看需求澄清请求。",
          "- 答案写入前，不要启动下游 agent。"
        ]
      : [
          "- Waiting for user input.",
          nextCommand ? `- Use \`${nextCommand}\` or answer through the host choice UI.` : "- Review the clarification request before continuing.",
          "- Do not start downstream agents until the answer is recorded."
        ];
  }
  if (state.status === "blocked") {
    return zh
      ? [
          "- 这个 run 当前被阻塞。",
          ...(blockers.length ? blockers.map((item) => `- 阻塞原因：${item}`) : ["- 阻塞原因：未记录。"]),
          "- 优先在当前 open run 内修复；只有用户明确关闭时才归档为 blocked。"
        ]
      : [
          "- This run is blocked.",
          ...(blockers.length ? blockers.map((item) => `- Blocker: ${item}`) : ["- Blocker: none recorded."]),
          "- Keep the run open and repair in this run first; close as blocked only when the user explicitly accepts that state."
        ];
  }
  if (state.status === "partial") {
    return zh
      ? ["- 这个 run 部分完成。", "- 可复用产物见下方列表。", "- 优先继续当前 open run；只有用户接受部分结果时才关闭为 partial。"]
      : ["- This run is partially complete.", "- Reusable artifacts are listed below.", "- Keep the run open by default; close as partial only when the user accepts partial completion."];
  }
  if (state.status === "done") {
    if (zh) return state.archived
      ? ["- 这个 run 已完成并归档。"]
      : ["- 这个 run 已完成，但尚未归档。", nextCommand ? `- 建议执行：\`${nextCommand}\`` : "- 建议执行 archive 收口。"];
    return state.archived
      ? ["- This run is complete and archived."]
      : ["- This run is complete, but archive closeout is still pending.", nextCommand ? `- Suggested command: \`${nextCommand}\`` : "- Run archive closeout."];
  }
  if (state.status === "canceled") return zh ? ["- 这个 run 已取消。如需恢复，使用 `crewup continue`。"] : ["- This run was canceled. Use `crewup continue` if the work should resume later."];
  if (state.status === "failed") return zh ? ["- 这个 run 执行失败。重试前先查看阻塞和归档摘要。"] : ["- This run failed. Review blockers and archive summary before retrying."];
  return zh
    ? [
        "- 继续执行下一个被授权的 CrewUp 步骤。",
        nextCommand ? `- 使用 \`${nextCommand}\`，并且只启动 runnable 列表里的 agent。` : "- 当前没有记录命令；诊断后重新运行 `npx crewup status <run-id>`。",
        "- 主 agent 只汇报状态和路径，不粘贴完整子 agent 输出。"
      ]
    : [
        "- Continue with the next allowed CrewUp step.",
        nextCommand ? `- Use \`${nextCommand}\` and start only agents listed as runnable.` : "- No command recorded; run `npx crewup status <run-id>` again after diagnostics.",
        "- Main agent should report paths and status only, not paste full subagent output."
      ];
}

function localeForState(state) {
  return state.primaryLanguage === "zh-CN" ? "zh-CN" : "en";
}

function labelsFor(locale) {
  if (locale === "zh-CN") {
    return {
      title: "# Run 状态",
      atAGlance: "## 一眼看懂",
      run: "Run",
      state: "状态",
      stageLabel: "阶段",
      outcomeLabel: "结果",
      verdict: "迭代结论",
      goal: "完成契约",
      ownerNow: "当前 Owner",
      next: "下一步",
      command: "命令",
      done: "完成",
      currentDecision: "## 当前决策",
      progress: "## 进度",
      blockers: "## 阻塞",
      reusableArtifacts: "## 可复用产物",
      yes: "是",
      no: "否",
      none: "无",
      notGenerated: "未生成"
    };
  }
  return {
    title: "# Run Status",
    atAGlance: "## At A Glance",
    run: "Run",
    state: "State",
    stageLabel: "stage",
    outcomeLabel: "outcome",
    verdict: "Iteration Verdict",
    goal: "Completion Contract",
    ownerNow: "Owner Now",
    next: "Next",
    command: "Command",
    done: "Done",
    currentDecision: "## Current Decision",
    progress: "## Progress",
    blockers: "## Blockers",
    reusableArtifacts: "## Reusable Artifacts",
    yes: "yes",
    no: "no",
    none: "none",
    notGenerated: "not generated"
  };
}

function localizedNextDescription(state, locale) {
  const text = state.nextAction?.description ?? "";
  if (locale !== "zh-CN") return text || "No next action recorded.";
  if (!text) return "未记录下一步。";
  if (text === "Review and answer the clarification card or requested approval.") return "查看并回答需求澄清卡或确认请求。";
  if (text === "Run the next allowed CrewUp agent or gate command.") return "运行下一个被授权的 CrewUp agent 或 gate 命令。";
  if (text === "Run the next allowed CrewUp agent or transition gate.") return "运行下一个被授权的 CrewUp agent 或阶段门禁。";
  if (text === "Run reached done; archive closeout is still pending.") return "Run 已到 done，仍需执行归档收口。";
  if (text === "No active next action.") return "没有活跃的下一步。";
  if (/is running; wait for its result/i.test(text)) return text.replace(" is running; wait for its result before deciding downstream routing.", " 正在运行；等待它写入 result 后再决定下游路由。");
  if (/found required fixes/i.test(text)) return text.replace(" found required fixes; generate a repair plan and route work to owner agents.", " 发现 required fixes；生成 repair-plan 并回到 owner agent。");
  if (/needs user input/i.test(text)) return "requirements-plan 需要用户输入。";
  return text;
}

function localizeProgressLabel(label, locale) {
  if (locale !== "zh-CN") return label;
  return {
    "Run created": "Run 已创建",
    "Branch recorded": "分支已记录",
    "Clarification card generated": "需求澄清卡已生成",
    "User confirmed requirements": "用户已确认需求",
    "Requirements completed": "正式需求已完成",
    "Architecture completed": "架构方案已完成",
    "Implementation completed": "实现已完成",
    "Tester passed": "测试已通过",
    "Reviewer passed": "评审已通过",
    "Release summary written": "发布摘要已写入",
    "Report generated": "报告已生成",
    "Archived": "已归档"
  }[label] ?? label;
}

function localizeReason(reason, locale) {
  if (locale !== "zh-CN") return reason;
  if (reason.startsWith("next incomplete step: ")) {
    return `下一个未完成步骤：${localizeProgressLabel(reason.replace("next incomplete step: ", ""), locale)}`;
  }
  return {
    "success outcome recorded": "已记录成功结果",
    "success outcome recorded and archived": "已记录成功结果并归档",
    "success outcome recorded; archive pending": "已记录成功结果，归档待完成",
    "canceled outcome": "已取消",
    "failed outcome": "已失败",
    blocked: "被阻塞",
    "not marked success": "尚未标记成功"
  }[reason] ?? reason;
}
