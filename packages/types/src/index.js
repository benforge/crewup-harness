import { z } from "zod";

export const articleStatusValues = ["draft", "published"];

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  name: z.string(),
});

export const articleSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  coverImage: z.string().url().nullable(),
  category: categorySchema.nullable(),
  tags: z.array(tagSchema),
  status: z.enum(articleStatusValues),
  viewCount: z.number().int().nonnegative(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const articleDetailSchema = articleSummarySchema.extend({
  body: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
});

export const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  admin: adminUserSchema,
  expiresAt: z.string().datetime(),
});

export const upsertArticleSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  coverImage: z.string().url().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const publishArticleSchema = z.object({
  publishedAt: z.string().datetime().optional(),
});

export const listArticlesResponseSchema = z.object({
  items: z.array(articleSummarySchema),
});

export const articleResponseSchema = z.object({
  article: articleDetailSchema,
});

export const articleViewResponseSchema = z.object({
  viewCount: z.number().int().nonnegative(),
});

export const adminSessionSchema = z.object({
  token: z.string(),
  admin: adminUserSchema,
});
