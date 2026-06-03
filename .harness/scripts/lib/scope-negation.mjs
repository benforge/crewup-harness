const negationPattern = "(?:不需要|不需|无需|不要|不用|不加|不做|别加|别做|不涉及|no|without|exclude|do not add|do not include|do not need|not need|no need for)";

export const scopeKeywordPatterns = {
  backend: [/backend|api|server|后端|服务端|接口/i],
  database: [/database|db|schema|prisma|migration|数据库|数据表|迁移|索引/i],
  auth: [/auth|authentication|login|signin|signup|permission|用户认证|登录|注册|权限|鉴权|认证/i],
  routing: [/routing|route|router|路由/i],
  devops: [/deploy|ci\/cd|docker|infra|pipeline|部署|流水线|环境变量/i]
};

export function stripNegatedScopeText(inputText) {
  return String(inputText ?? "")
    .replace(new RegExp(`${negationPattern}[^。！？!?\\n]*`, "gi"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isScopeNegated(inputText, scope) {
  const patterns = scopeKeywordPatterns[scope] ?? [new RegExp(escapeRegExp(scope), "i")];
  const clauses = negatedClauses(inputText);
  return clauses.some((clause) => patterns.some((pattern) => pattern.test(clause)));
}

export function negatedScopes(inputText, scopes = Object.keys(scopeKeywordPatterns)) {
  return scopes.filter((scope) => isScopeNegated(inputText, scope));
}

export function hasPositiveMatch(inputText, patterns, { scope = "" } = {}) {
  if (scope && isScopeNegated(inputText, scope)) return false;
  const effectiveText = stripNegatedScopeText(inputText);
  return patterns.some((pattern) => pattern.test(effectiveText));
}

function negatedClauses(inputText) {
  const text = String(inputText ?? "");
  const matches = text.match(new RegExp(`${negationPattern}[^。！？!?\\n]*`, "gi"));
  return matches ?? [];
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
