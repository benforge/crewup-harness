export type ArticleStatus = 'draft' | 'published';

export interface Author {
  id: string;
  name: string;
  displayName: string;
  role: 'admin' | 'editor';
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImage: string | null;
  authorId: string;
  author: Author;
  categoryId: string | null;
  category: Category | null;
  tagIds: string[];
  tags: Tag[];
  status: ArticleStatus;
  viewCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  aiSummary: string | null;
  contentSummary: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ArticleSummary = Omit<Article, 'body' | 'categoryId' | 'tagIds' | 'authorId'>;

export type ArticleDetail = Article;
