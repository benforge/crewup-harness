export const siteName = "工程手记";
export const siteDescription = "一个由工程手记组成的技术站点，记录实践、架构取舍、项目复盘和工具方法。";
export const siteKeywords = ["工程手记", "工程实践", "架构设计", "项目复盘", "工具方法", "Next.js", "TypeScript"];

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return rawUrl.replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
