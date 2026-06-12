import { analyzeWorkload } from "./workload-analysis.mjs";

export function renderRunModePicker({ requestText, command = "run" }) {
  const recommendation = recommendRunMode(requestText);
  const quoted = quoteForCommand(requestText);
  return [
    "CrewUp mode selection required.",
    "",
    "Choose one mode before creating a formal run:",
    "",
    "A. plan",
    "   Only plan; do not change business code.",
    "   Use when requirements are unclear, you need a design/roadmap, or you want team/customer review first.",
    "",
    "B. lite-v2",
    "   Small scoped implementation.",
    "   Use for a single bug, small UI/copy change, one component/API tweak, or one phase from an existing plan.",
    "",
    "C. strict",
    "   Full delivery workflow.",
    "   Use for complete features, cross-module work, frontend/backend/database/auth changes, or work needing tester/reviewer/release evidence.",
    "",
    `Recommended: ${recommendation.mode}`,
    `Reason: ${recommendation.reason}`,
    "",
    "Run one of:",
    `  npx crewup ${command} --mode=plan ${quoted}`,
    `  npx crewup ${command} --mode=lite ${quoted}`,
    `  npx crewup ${command} --mode=strict ${quoted}`,
    "",
    "No run was created."
  ].join("\n");
}

export function renderContinueModePicker({ sourceRunId, requestText, sourceState }) {
  const recommendation = recommendContinueMode(requestText, sourceState);
  const quoted = quoteForCommand(requestText);
  const planSource = sourceState?.workflowProfile === "plan_only";
  const choices = planSource
    ? [
        "A. plan",
        "   Continue planning only; update or refine the previous plan without changing business code.",
        "",
        "B. lite-v2",
        "   Implement one small phase or one clearly scoped part from the plan.",
        "",
        "C. strict",
        "   Implement the approved plan through the full delivery workflow."
      ]
    : [
        "A. plan",
        "   Re-plan or reassess only; do not change business code.",
        "",
        "B. lite-v2",
        "   Small follow-up implementation or single bugfix.",
        "",
        "C. strict",
        "   Full follow-up delivery, larger rework, or cross-module change."
      ];

  return [
    "CrewUp continuation mode selection required.",
    "",
    planSource
      ? `Source run ${sourceRunId} is a plan run. Choose how to use the approved plan:`
      : `Choose how to continue from source run ${sourceRunId}:`,
    "",
    ...choices,
    "",
    `Recommended: ${recommendation.mode}`,
    `Reason: ${recommendation.reason}`,
    "",
    "Run one of:",
    `  npx crewup continue ${sourceRunId} --mode=plan ${quoted}`,
    `  npx crewup continue ${sourceRunId} --mode=lite ${quoted}`,
    `  npx crewup continue ${sourceRunId} --mode=strict ${quoted}`,
    "",
    "No continuation run was created."
  ].join("\n");
}

function recommendRunMode(requestText) {
  const analysis = analyzeWorkload(requestText, { requestedProfile: "auto" });
  if (analysis.signals.planOnly) return { mode: "plan", reason: "The request explicitly asks for planning/no-code work." };
  if (analysis.signals.highRisk || analysis.signals.strictWorkflow || analysis.signals.deepPlanning || analysis.complexityScore >= 4) {
    return { mode: "strict", reason: "The request appears broad or risky enough to need full delivery evidence." };
  }
  return { mode: "lite-v2", reason: "The request appears small enough for a scoped implementation run." };
}

function recommendContinueMode(requestText, sourceState) {
  const analysis = analyzeWorkload(requestText, { requestedProfile: "auto" });
  if (analysis.signals.planOnly) return { mode: "plan", reason: "The follow-up explicitly asks for planning/no-code work." };
  if (sourceState?.workflowProfile === "plan_only") {
    if (/\bphase\b|first|only|small|part|slice|阶段|第一阶段|只做|先做|小范围/i.test(String(requestText ?? ""))) {
      return { mode: "lite-v2", reason: "The follow-up appears to implement one scoped part of the plan." };
    }
    return { mode: "strict", reason: "Continuing from a plan run usually means implementing the approved plan." };
  }
  if (sourceState?.archived === true && sourceState?.outcome === "success" && analysis.complexityScore <= 2) {
    return { mode: "lite-v2", reason: "This looks like a small follow-up after a successful archived run." };
  }
  if (analysis.signals.highRisk || analysis.signals.strictWorkflow || analysis.signals.deepPlanning || analysis.complexityScore >= 4) {
    return { mode: "strict", reason: "The follow-up appears broad or risky enough to need the full workflow." };
  }
  return { mode: "lite-v2", reason: "The follow-up appears small enough for a scoped implementation run." };
}

function quoteForCommand(value) {
  const text = String(value ?? "").trim();
  if (!text) return "\"...\"";
  return `"${text.replaceAll('"', '\\"')}"`;
}
