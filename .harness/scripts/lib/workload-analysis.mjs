const defaultProfiles = new Set(["discovery", "plan_only", "lite", "standard", "full"]);

const highRiskSignals = [
  /\u751f\u4ea7|\u771f\u5b9e\u6570\u636e|\u5220\u9664|\u8fc1\u79fb|\u8986\u76d6|\u91cd\u7f6e|\u56de\u6eda|\u5bc6\u94a5|\u6743\u9650|\u9274\u6743|\u8ba4\u8bc1/i,
  /token|password|secret|drop table|truncate|delete from|\.env|ci\/cd|deploy|infra|database|migration/i
];

const deepPlanningSignals = [
  /MVP|\u5b8c\u6574|\u7cfb\u7edf|\u67b6\u6784|\u65b9\u6848|\u8bbe\u8ba1|\u91cd\u6784|\u591a\u7aef|\u8de8\u6a21\u5757|\u652f\u4ed8|\u767b\u5f55|\u6ce8\u518c|\u540e\u53f0\u7ba1\u7406/i,
  /\u6570\u636e\u6a21\u578b|\u63a5\u53e3\u8bbe\u8ba1|\u9700\u6c42\u5206\u6790|\u9a8c\u6536\u6807\u51c6|\u4ece\u96f6|\u65b0\u589e.*\u6a21\u5757|\u65b0\u589e.*\u7cfb\u7edf/i,
  /architecture|system design|module boundary|acceptance criteria|implementation plan/i
];

const strictWorkflowSignals = [
  /\u5b8c\u6574\u95ed\u73af|\u5f3a\u6d41\u7a0b|\u4e25\u683c\u6d41\u7a0b|\u5fc5\u987b.*tester|\u5fc5\u987b.*reviewer|\u5fc5\u987b.*release|\u9700\u6c42\u786e\u8ba4.*\u67b6\u6784.*\u5b9e\u73b0/i,
  /full loop|strict workflow|complete development loop|requirements.*architect.*tester.*reviewer.*release/i
];

const liteSignals = [
  /\u5c0f\u6539|\u5f88\u5c0f|\u8f7b\u5fae|\u6587\u6863|\u6837\u5f0f|\u989c\u8272|\u95f4\u8ddd|\u6309\u94ae|\u6807\u9898|\u9519\u522b\u5b57/i,
  /copy|css|UI|layout|page|fix|bug/i
];

const ambiguitySignals = [
  /\u60f3\u6cd5|\u8fd8\u6ca1\u60f3\u6e05\u695a|\u4e0d\u786e\u5b9a|\u5927\u6982|\u53ef\u80fd|\u5c1d\u8bd5|\u63a2\u7d22|\u51e0\u4e2a\u65b9\u5411|\u8111\u66b4|\u8ba8\u8bba\u4e00\u4e0b/i,
  /maybe|brainstorm|explore/i
];

const discoverySignals = [
  /\u65b0\u9879\u76ee|\u4ece\u96f6|\u521d\u59cb\u5316\u9879\u76ee|\u76ee\u5f55\u7ed3\u6784|\u9879\u76ee\u7ed3\u6784|\u6a21\u5757\u8fb9\u754c|\u6280\u672f\u9009\u578b|\u6280\u672f\u8def\u7ebf|\u9636\u6bb5\u8ba1\u5212|\u8def\u7ebf\u56fe|\u600e\u4e48\u7528|\u5982\u4f55\u4f7f\u7528/i,
  /new project|bootstrap|directory structure|project structure|roadmap/i
];

const planOnlySignals = [
  /\u5148\u89c4\u5212|\u53ea\u89c4\u5212|\u53ea\u505a\u89c4\u5212|\u53ea\u505a\u65b9\u6848|\u53ea\u505a\u9700\u6c42|\u53ea\u505a\u67b6\u6784|\u5148\u505a\u65b9\u6848|\u5148\u4e0d\u8981\u5199\u4ee3\u7801|\u4e0d\u8981\u5199\u4ee3\u7801|\u4e0d\u5199\u4ee3\u7801|\u4e0d\u6539\u4ee3\u7801|\u4e0d\u5b9e\u73b0/i,
  /plan-only|planning only|do not write code|no code/i
];

export function analyzeWorkload(inputText, { requestedProfile = "auto" } = {}) {
  const text = String(inputText ?? "");
  const signals = collectSignals(text);
  const complexityScore = scoreForSignals(signals);
  const inferredProfile = profileForScore(complexityScore, signals);
  const workflowProfile = chooseRequestedProfile(requestedProfile, inferredProfile, signals);
  const runType = runTypeForProfile(workflowProfile, signals);
  const needsRequirementsPlan = signals.ambiguous || signals.deepPlanning || signals.discovery || signals.planOnly || workflowProfile !== "lite";

  return {
    workflowProfile,
    runType,
    inferredProfile,
    requestedProfile,
    complexityScore,
    complexityLevel: complexityLevel(complexityScore),
    needsRequirementsPlan,
    signals,
    reasons: reasonsFor(signals, complexityScore, workflowProfile)
  };
}

export function chooseWorkflowProfile(inputText, requestedProfile = "auto") {
  return analyzeWorkload(inputText, { requestedProfile }).workflowProfile;
}

export function renderWorkloadAnalysisMarkdown(analysis) {
  return [
    "# Workload Analysis",
    "",
    `- workflow_profile: ${analysis.workflowProfile}`,
    `- run_type: ${analysis.runType}`,
    `- inferred_profile: ${analysis.inferredProfile}`,
    `- requested_profile: ${analysis.requestedProfile}`,
    `- complexity_score: ${analysis.complexityScore}`,
    `- complexity_level: ${analysis.complexityLevel}`,
    `- needs_requirements_plan: ${analysis.needsRequirementsPlan ? "true" : "false"}`,
    "",
    "## Signals",
    "",
    `- high_risk: ${analysis.signals.highRisk ? "true" : "false"}`,
    `- deep_planning: ${analysis.signals.deepPlanning ? "true" : "false"}`,
    `- strict_workflow: ${analysis.signals.strictWorkflow ? "true" : "false"}`,
    `- lite: ${analysis.signals.lite ? "true" : "false"}`,
    `- ambiguous: ${analysis.signals.ambiguous ? "true" : "false"}`,
    `- discovery: ${analysis.signals.discovery ? "true" : "false"}`,
    `- plan_only: ${analysis.signals.planOnly ? "true" : "false"}`,
    "",
    "## Reasons",
    "",
    ...analysis.reasons.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function chooseRequestedProfile(requested, inferred, signals) {
  if (!requested || requested === "auto") return inferred;
  if (!defaultProfiles.has(requested)) return "standard";
  if (!["full", "plan_only", "discovery"].includes(requested) && (signals.highRisk || signals.strictWorkflow)) return "full";
  return requested;
}

function collectSignals(text) {
  return {
    highRisk: highRiskSignals.some((pattern) => pattern.test(text)),
    deepPlanning: deepPlanningSignals.some((pattern) => pattern.test(text)),
    strictWorkflow: strictWorkflowSignals.some((pattern) => pattern.test(text)),
    lite: liteSignals.some((pattern) => pattern.test(text)),
    ambiguous: ambiguitySignals.some((pattern) => pattern.test(text)),
    discovery: discoverySignals.some((pattern) => pattern.test(text)),
    planOnly: planOnlySignals.some((pattern) => pattern.test(text)),
    multiSentence: text.split(/[\u3002\uff01\uff1f!?\n]/).filter((item) => item.trim()).length >= 3,
    longInput: text.length > 600
  };
}

function scoreForSignals(signals) {
  let score = 1;
  if (signals.lite) score += 1;
  if (signals.deepPlanning) score += 2;
  if (signals.strictWorkflow) score += 3;
  if (signals.discovery) score += 2;
  if (signals.planOnly) score += 1;
  if (signals.ambiguous) score += 1;
  if (signals.multiSentence) score += 1;
  if (signals.longInput) score += 1;
  if (signals.highRisk) score += 3;
  return Math.min(score, 5);
}

function profileForScore(score, signals) {
  if (signals.planOnly) return "plan_only";
  if (signals.discovery) return "discovery";
  if (signals.highRisk || signals.strictWorkflow || score >= 5) return "full";
  if (signals.deepPlanning || signals.ambiguous || score >= 3) return "standard";
  return "lite";
}

function runTypeForProfile(profile, signals) {
  if (profile === "discovery") return "discovery";
  if (profile === "plan_only") return "plan_only";
  if (signals.highRisk) return "high_risk_feature";
  if (profile === "lite") return "implementation";
  return "feature";
}

function complexityLevel(score) {
  if (score <= 2) return "low";
  if (score <= 4) return "medium";
  return "high";
}

function reasonsFor(signals, score, workflowProfile) {
  const reasons = [`complexity ${score}/5 -> ${workflowProfile}`];
  if (signals.highRisk) reasons.push("high-risk signal detected; full profile and stronger gates are required.");
  if (signals.strictWorkflow) reasons.push("explicit strict/full-loop workflow requested; keep the full harness flow.");
  if (signals.discovery) reasons.push("new-project or project-shape signal detected; use discovery planning flow.");
  if (signals.planOnly) reasons.push("planning-only/no-code signal detected; do not enter implementation.");
  if (signals.deepPlanning) reasons.push("architecture/system/module-boundary signal detected; use formal planning artifacts.");
  if (signals.ambiguous) reasons.push("ambiguous requirement signal detected; requirements-plan should clarify scope first.");
  if (signals.lite && !signals.highRisk && !signals.deepPlanning && !signals.strictWorkflow) reasons.push("small-change signal detected; lite is allowed only when strict workflow is not requested.");
  if (signals.multiSentence) reasons.push("input contains multiple goals; keep requirements traceability.");
  if (signals.longInput) reasons.push("input is long; use artifacts and context packs instead of pasting full context.");
  return reasons;
}
