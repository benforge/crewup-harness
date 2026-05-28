import { Injectable } from '@nestjs/common';
import { CreateArticleDto } from '../dto/create-article.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { Article, ArticleStatus, Author, Category, Tag } from '../types/article.types';
import { ArticleRepository } from './article.repository';

@Injectable()
export class InMemoryArticleRepository implements ArticleRepository {
  private readonly admin: Author = {
    id: 'admin-1',
    name: 'Blog Admin',
    displayName: 'Blog Admin',
    role: 'editor',
  };

  private readonly articles = new Map<string, Article>();
  private readonly categories = new Map<string, Category>();
  private readonly tags = new Map<string, Tag>();

  constructor() {
    const now = new Date('2026-05-15T00:00:00.000Z').toISOString();

    [
      {
        id: 'category-product',
        slug: 'product-notes',
        name: '产品笔记',
        description: '围绕产品设计、内容系统和工作流的实践记录。',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'category-engineering',
        slug: 'engineering',
        name: '工程实践',
        description: '面向开发、架构和交付质量的技术札记。',
        createdAt: now,
        updatedAt: now,
      },
    ].forEach((category) => this.categories.set(category.id, category));

    [
      { id: 'tag-intro', slug: 'intro', name: '入门', createdAt: now, updatedAt: now },
      { id: 'tag-mvp', slug: 'mvp', name: 'MVP', createdAt: now, updatedAt: now },
      { id: 'tag-seo', slug: 'seo', name: 'SEO', createdAt: now, updatedAt: now },
      { id: 'tag-workflow', slug: 'workflow', name: '工作流', createdAt: now, updatedAt: now },
      { id: 'tag-draft', slug: 'draft', name: '草稿', createdAt: now, updatedAt: now },
    ].forEach((tag) => this.tags.set(tag.id, tag));

    [
      this.buildArticle(
        {
          id: 'article-1',
          slug: 'hello-world',
          title: 'Hello World',
          summary: '第一篇已发布文章，用来验证博客前台、后台和内容模型的最小闭环。',
          body:
            '# Hello World\n\n这是一篇用于验证 MVP+ 博客系统的示例文章。\n\n## 内容优先\n\n专业简约的博客应该把注意力留给正文。',
          coverImage: null,
          categoryId: 'category-product',
          tags: ['intro', 'mvp', 'seo'],
          status: 'published',
          viewCount: 0,
          seoTitle: 'Hello World',
          seoDescription: '第一篇已发布文章，用来验证博客前台、后台和内容模型的最小闭环。',
          seoKeywords: 'MVP,博客,SEO',
          canonicalUrl: null,
          aiSummary: '这篇文章说明 MVP+ 博客系统的阅读体验、内容组织字段和后续扩展方向。',
          contentSummary: 'MVP+ 博客系统示例文章。',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ),
      this.buildArticle(
        {
          id: 'article-2',
          slug: 'building-a-complete-blog-system',
          title: '搭建一个完整博客系统需要补齐什么',
          summary: '从文章、分类、标签、发布状态和 SEO/GEO 字段出发，梳理 MVP+ 阶段的关键能力。',
          body:
            '# 搭建一个完整博客系统需要补齐什么\n\n完整博客系统需要稳定的内容组织、发布控制和可被搜索理解的结构。\n\n## 内容模型\n\n文章需要标题、slug、摘要、正文、封面、作者、分类、标签、发布时间和更新时间。',
          coverImage: null,
          categoryId: 'category-engineering',
          tags: ['mvp', 'workflow'],
          status: 'published',
          viewCount: 0,
          seoTitle: '搭建一个完整博客系统需要补齐什么',
          seoDescription: '梳理 MVP+ 博客系统在内容组织、发布控制和 SEO/GEO 方面的关键能力。',
          seoKeywords: '博客系统,MVP,内容系统',
          canonicalUrl: null,
          aiSummary: '文章总结了完整博客系统的内容模型、管理能力和可发现性要求。',
          contentSummary: '完整博客系统能力边界说明。',
          publishedAt: new Date('2026-05-18T00:00:00.000Z').toISOString(),
          createdAt: now,
          updatedAt: new Date('2026-05-18T00:00:00.000Z').toISOString(),
        },
      ),
      this.buildArticle(
        {
          id: 'article-3',
          slug: 'draft-notes',
          title: 'Draft Notes',
          summary: 'An unpublished draft for admin editing.',
          body: 'Draft content goes here.',
          coverImage: null,
          categoryId: 'category-product',
          tags: ['draft'],
          status: 'draft',
          viewCount: 0,
          seoTitle: null,
          seoDescription: null,
          seoKeywords: null,
          canonicalUrl: null,
          aiSummary: null,
          contentSummary: null,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ),
    ].forEach((article) => this.articles.set(article.id, article));
  }

  listPublished(): Article[] {
    return this.sortPublished(this.listAll('published'));
  }

  findPublishedBySlug(slug: string): Article | null {
    return this.listPublished().find((article) => article.slug === slug) ?? null;
  }

  listPublishedByCategory(slug: string): Article[] {
    return this.listPublished().filter((article) => article.category?.slug === slug);
  }

  listPublishedByTag(slug: string): Article[] {
    return this.listPublished().filter((article) => article.tags.some((tag) => tag.slug === slug));
  }

  listAll(status?: ArticleStatus): Article[] {
    const articles = [...this.articles.values()];
    return status ? articles.filter((article) => article.status === status) : articles;
  }

  findById(id: string): Article | null {
    return this.articles.get(id) ?? null;
  }

  incrementViewCountBySlug(slug: string): Article | null {
    const article = this.listPublished().find((item) => item.slug === slug);
    if (!article) return null;

    const next: Article = {
      ...article,
      viewCount: article.viewCount + 1,
    };
    this.articles.set(next.id, next);
    return next;
  }

  saveDraft(input: CreateArticleDto): Article {
    const timestamp = new Date().toISOString();
    const article = this.buildArticle({
      id: `article-${this.articles.size + 1}`,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body: input.body,
      coverImage: input.coverImage ?? null,
      categoryId: input.categoryId ?? null,
      tags: input.tags,
      status: 'draft',
      viewCount: 0,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      seoKeywords: input.seoKeywords ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      aiSummary: input.aiSummary ?? null,
      contentSummary: input.contentSummary ?? null,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    this.assertUniqueArticleSlug(article.slug, article.id);
    this.articles.set(article.id, article);
    return article;
  }

  update(id: string, input: UpdateArticleDto): Article | null {
    const existing = this.articles.get(id);
    if (!existing) return null;
    const patch = withoutUndefinedArticle(input);

    const next = this.buildArticle({
      ...existing,
      ...patch,
      tags: patch.tags ?? existing.tags.map((tag) => tag.slug),
      categoryId: patch.categoryId === undefined ? existing.categoryId : patch.categoryId,
      updatedAt: new Date().toISOString(),
    });

    this.assertUniqueArticleSlug(next.slug, next.id);
    this.articles.set(id, next);
    return next;
  }

  publish(id: string, publishedAt?: string): Article | null {
    const article = this.articles.get(id);
    if (!article) return null;

    const timestamp = new Date().toISOString();
    const published: Article = {
      ...article,
      status: 'published',
      publishedAt: publishedAt ?? article.publishedAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.articles.set(id, published);
    return published;
  }

  unpublish(id: string): Article | null {
    const article = this.articles.get(id);
    if (!article) return null;

    const unpublished: Article = {
      ...article,
      status: 'draft',
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    };

    this.articles.set(id, unpublished);
    return unpublished;
  }

  listCategories(): Category[] {
    return [...this.categories.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  createCategory(input: CreateCategoryDto): Category {
    this.assertUniqueCategorySlug(input.slug);
    const timestamp = new Date().toISOString();
    const category: Category = {
      id: `category-${this.categories.size + 1}`,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.categories.set(category.id, category);
    this.refreshArticleRelations();
    return category;
  }

  updateCategory(id: string, input: UpdateCategoryDto): Category | null {
    const existing = this.categories.get(id);
    if (!existing) return null;
    if (input.slug) this.assertUniqueCategorySlug(input.slug, id);

    const category: Category = {
      ...existing,
      ...input,
      description: input.description === undefined ? existing.description : input.description,
      updatedAt: new Date().toISOString(),
    };
    this.categories.set(id, category);
    this.refreshArticleRelations();
    return category;
  }

  deleteCategory(id: string): boolean {
    const deleted = this.categories.delete(id);
    if (!deleted) return false;
    for (const article of this.articles.values()) {
      if (article.categoryId === id) {
        this.articles.set(article.id, { ...article, categoryId: null, category: null });
      }
    }
    return true;
  }

  listTags(): Tag[] {
    return [...this.tags.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  createTag(input: CreateTagDto): Tag {
    this.assertUniqueTagSlug(input.slug);
    const timestamp = new Date().toISOString();
    const tag: Tag = {
      id: `tag-${this.tags.size + 1}`,
      slug: input.slug,
      name: input.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.tags.set(tag.id, tag);
    return tag;
  }

  updateTag(id: string, input: UpdateTagDto): Tag | null {
    const existing = this.tags.get(id);
    if (!existing) return null;
    if (input.slug) this.assertUniqueTagSlug(input.slug, id);

    const tag: Tag = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.tags.set(id, tag);
    this.refreshArticleRelations();
    return tag;
  }

  deleteTag(id: string): boolean {
    const deleted = this.tags.delete(id);
    if (!deleted) return false;
    for (const article of this.articles.values()) {
      if (article.tagIds.includes(id)) {
        this.articles.set(article.id, {
          ...article,
          tagIds: article.tagIds.filter((tagId) => tagId !== id),
          tags: article.tags.filter((tag) => tag.id !== id),
        });
      }
    }
    return true;
  }

  private buildArticle(input: Omit<Article, 'author' | 'category' | 'tagIds' | 'tags' | 'authorId'> & {
    categoryId: string | null;
    tags: string[];
    authorId?: string;
  }): Article {
    const tagIds = input.tags.map((tag) => this.resolveTagId(tag));
    return {
      ...input,
      authorId: input.authorId ?? this.admin.id,
      author: this.admin,
      category: input.categoryId ? this.categories.get(input.categoryId) ?? null : null,
      tagIds,
      tags: tagIds.map((tagId) => this.tags.get(tagId)).filter((tag): tag is Tag => Boolean(tag)),
    };
  }

  private resolveTagId(value: string): string {
    const normalized = slugify(value);
    const existing = [...this.tags.values()].find(
      (tag) => tag.id === value || tag.slug === normalized || tag.name.toLowerCase() === value.toLowerCase(),
    );
    if (existing) return existing.id;

    const timestamp = new Date().toISOString();
    const tag: Tag = {
      id: `tag-${this.tags.size + 1}`,
      slug: normalized,
      name: value,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.tags.set(tag.id, tag);
    return tag.id;
  }

  private refreshArticleRelations() {
    for (const article of this.articles.values()) {
      this.articles.set(article.id, {
        ...article,
        category: article.categoryId ? this.categories.get(article.categoryId) ?? null : null,
        tags: article.tagIds.map((tagId) => this.tags.get(tagId)).filter((tag): tag is Tag => Boolean(tag)),
      });
    }
  }

  private sortPublished(articles: Article[]): Article[] {
    return articles.sort((left, right) => {
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }

  private assertUniqueArticleSlug(slug: string, exceptId?: string) {
    if (this.listAll().some((article) => article.slug.toLowerCase() === slug.toLowerCase() && article.id !== exceptId)) {
      throw new Error('ARTICLE_SLUG_CONFLICT');
    }
  }

  private assertUniqueCategorySlug(slug: string, exceptId?: string) {
    if ([...this.categories.values()].some((category) => category.slug.toLowerCase() === slug.toLowerCase() && category.id !== exceptId)) {
      throw new Error('CATEGORY_SLUG_CONFLICT');
    }
  }

  private assertUniqueTagSlug(slug: string, exceptId?: string) {
    if ([...this.tags.values()].some((tag) => tag.slug.toLowerCase() === slug.toLowerCase() && tag.id !== exceptId)) {
      throw new Error('TAG_SLUG_CONFLICT');
    }
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withoutUndefinedArticle(input: UpdateArticleDto): UpdateArticleDto {
  return Object.fromEntries(Object.entries(input).filter(([, item]) => item !== undefined)) as UpdateArticleDto;
}
