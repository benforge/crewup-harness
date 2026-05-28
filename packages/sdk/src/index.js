import {
  articleResponseSchema,
  articleViewResponseSchema,
  listArticlesResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  publishArticleSchema,
  upsertArticleSchema,
} from "../../types/src/index.js";

async function request(baseUrl, path, init = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export function createApiClient(baseUrl = "http://localhost:3001") {
  return {
    listPublishedArticles: async () => listArticlesResponseSchema.parse(await request(baseUrl, "/api/articles")),
    getArticle: async (slug) => articleResponseSchema.parse(await request(baseUrl, `/api/articles/${slug}`)),
    recordArticleView: async (slug) =>
      articleViewResponseSchema.parse(
        await request(baseUrl, `/api/articles/${slug}/view`, {
          method: "POST",
        }),
      ),
    login: async (credentials) => {
      const body = loginRequestSchema.parse(credentials);
      return loginResponseSchema.parse(
        await request(baseUrl, "/api/admin/login", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
    listAdminArticles: async (token) =>
      listArticlesResponseSchema.parse(
        await request(baseUrl, "/api/admin/articles", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    upsertArticle: async (token, article) => {
      const body = upsertArticleSchema.parse(article);
      return articleResponseSchema.parse(
        await request(baseUrl, "/api/admin/articles", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }),
      );
    },
    publishArticle: async (token, id, payload = {}) => {
      const body = publishArticleSchema.parse(payload);
      return articleResponseSchema.parse(
        await request(baseUrl, `/api/admin/articles/${id}/publish`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }),
      );
    },
  };
}

export function formatPublishedAt(value) {
  if (!value) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function parseTags(value) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
