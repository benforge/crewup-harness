const defaultProfiles = new Set(["lite", "standard", "full"]);

const highRiskSignals = [
  /生产|真实数据|删除|迁移|覆盖|重置|回滚|密钥|权限|鉴权|认证/i,
  /token|password|secret|drop table|truncate|delete from|\.env|ci\/cd|deploy|infra|database|migration/i
];

const deepPlanningSignals = [
  /MVP|完整|系统|架构|方案|设计|重构|多端|跨模块|支付|登录|注册|后台管理/i,
  /数据模型|接口设计|需求分析|验收标准|从零|新增.*模块|新增.*系统/i
];

const liteSignals = [
  /小改|很小|轻微|文档|样式|颜色|间距|按钮|标题|错别字/i,
  /copy|css|UI|布局|首页|页面|修复|bug/i
];

const ambiguitySignals = [
  /想法|还没想清楚|不确定|大概|可能|尝试|探索|几个方向|脑暴|讨论一下/i,
  /maybe|brainstorm|explore/i
];

export function analyzeWorkload(inputText, { requestedProfile = "auto" } = {}) {
  const text = String(inputText ?? "");
  const signals = collectSignals(text);
  const complexityScore = scoreForSignals(signals);
  const inferredProfile = profileForScore(complexityScore, signals);
  const workflowProfile = chooseRequestedProfile(requestedProfile, inferredProfile, signals);
  const needsRequirementsPlan = signals.ambiguous || signals.deepPlanning || workflowProfile !== "lite";

  return {
    workflowProfile,
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
    "# 工作量分析",
    "",
    `- workflow_profile: ${analysis.workflowProfile}`,
    `- inferred_profile: ${analysis.inferredProfile}`,
    `- requested_profile: ${analysis.requestedProfile}`,
    `- complexity_score: ${analysis.complexityScore}`,
    `- complexity_level: ${analysis.complexityLevel}`,
    `- needs_requirements_plan: ${analysis.needsRequirementsPlan ? "true" : "false"}`,
    "",
    "## 命中信号",
    "",
    `- high_risk: ${analysis.signals.highRisk ? "true" : "false"}`,
    `- deep_planning: ${analysis.signals.deepPlanning ? "true" : "false"}`,
    `- lite: ${analysis.signals.lite ? "true" : "false"}`,
    `- ambiguous: ${analysis.signals.ambiguous ? "true" : "false"}`,
    "",
    "## 原因",
    "",
    ...analysis.reasons.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function chooseRequestedProfile(requested, inferred, signals) {
  if (!requested || requested === "auto") return inferred;
  if (!defaultProfiles.has(requested)) return "standard";
  if (requested !== "full" && signals.highRisk) return "full";
  return requested;
}

function collectSignals(text) {
  return {
    highRisk: highRiskSignals.some((pattern) => pattern.test(text)),
    deepPlanning: deepPlanningSignals.some((pattern) => pattern.test(text)),
    lite: liteSignals.some((pattern) => pattern.test(text)),
    ambiguous: ambiguitySignals.some((pattern) => pattern.test(text)),
    multiSentence: text.split(/[。！？?!；;\n]/).filter((item) => item.trim()).length >= 3,
    longInput: text.length > 600
  };
}

function scoreForSignals(signals) {
  let score = 1;
  if (signals.lite) score += 1;
  if (signals.deepPlanning) score += 2;
  if (signals.ambiguous) score += 1;
  if (signals.multiSentence) score += 1;
  if (signals.longInput) score += 1;
  if (signals.highRisk) score += 3;
  return Math.min(score, 5);
}

function profileForScore(score, signals) {
  if (signals.highRisk || score >= 5) return "full";
  if (signals.deepPlanning || signals.ambiguous || score >= 3) return "standard";
  return "lite";
}

function complexityLevel(score) {
  if (score <= 2) return "low";
  if (score <= 4) return "medium";
  return "high";
}

function reasonsFor(signals, score, workflowProfile) {
  const reasons = [`complexity ${score}/5 -> ${workflowProfile}`];
  if (signals.highRisk) reasons.push("命中高风险信号，需要 full 档位和更强门禁。");
  if (signals.deepPlanning) reasons.push("命中架构/方案/跨模块信号，需要标准化规划。");
  if (signals.ambiguous) reasons.push("需求仍偏模糊，建议先走 requirements-plan。");
  if (signals.lite && !signals.highRisk && !signals.deepPlanning) reasons.push("命中轻量变更信号，可优先 lite。");
  if (signals.multiSentence) reasons.push("输入包含多段目标，建议保留需求澄清。");
  if (signals.longInput) reasons.push("输入较长，建议用 artifact/context-pack 分段承载。");
  return reasons;
}
