import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { PublishArticleDto } from './dto/publish-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import {
  ARTICLE_REPOSITORY,
  ArticleRepository,
} from './repositories/article.repository';
import { Article, ArticleDetail, ArticleStatus, ArticleSummary, Category, Tag } from './types/article.types';

@Injectable()
export class ArticlesService {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepository: ArticleRepository,
  ) {}

  listPublished(): ArticleSummary[] {
    return this.articleRepository.listPublished().map(toSummary);
  }

  getPublishedBySlug(slug: string): ArticleDetail {
    const article = this.articleRepository.findPublishedBySlug(slug);
    if (!article) {
      throw notFound('ARTICLE_NOT_FOUND', 'Article not found');
    }

    return toDetail(article);
  }

  recordPublishedArticleView(slug: string) {
    const article = this.articleRepository.incrementViewCountBySlug(slug);
    if (!article) {
      throw notFound('ARTICLE_NOT_FOUND', 'Article not found');
    }

    return { viewCount: normalizeViewCount(article.viewCount) };
  }

  listPublishedByCategory(slug: string): ArticleSummary[] {
    return this.articleRepository.listPublishedByCategory(slug).map(toSummary);
  }

  listPublishedByTag(slug: string): ArticleSummary[] {
    return this.articleRepository.listPublishedByTag(slug).map(toSummary);
  }

  listAll(status?: ArticleStatus): ArticleSummary[] {
    return this.articleRepository.listAll(status).map(toSummary);
  }

  getById(id: string): ArticleDetail {
    const article = this.articleRepository.findById(id);
    if (!article) {
      throw notFound('ARTICLE_NOT_FOUND', 'Article not found');
    }

    return toDetail(article);
  }

  createDraft(input: CreateArticleDto): ArticleDetail {
    try {
      return toDetail(this.articleRepository.saveDraft(input));
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  update(id: string, input: UpdateArticleDto): ArticleDetail {
    try {
      const article = this.articleRepository.update(id, input);
      if (!article) {
        throw notFound('ARTICLE_NOT_FOUND', 'Article not found');
      }
      return toDetail(article);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw mapRepositoryError(error);
    }
  }

  publish(id: string, input: PublishArticleDto): ArticleDetail {
    const article = this.articleRepository.publish(id, input.publishedAt);
    if (!article) {
      throw notFound('ARTICLE_NOT_FOUND', 'Article not found');
    }

    return toDetail(article);
  }

  unpublish(id: string): ArticleDetail {
    const article = this.articleRepository.unpublish(id);
    if (!article) {
      throw notFound('ARTICLE_NOT_FOUND', 'Article not found');
    }

    return toDetail(article);
  }

  listCategories(): Category[] {
    return this.articleRepository.listCategories();
  }

  createCategory(input: CreateCategoryDto): Category {
    try {
      return this.articleRepository.createCategory(input);
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  updateCategory(id: string, input: UpdateCategoryDto): Category {
    try {
      const category = this.articleRepository.updateCategory(id, input);
      if (!category) {
        throw notFound('CATEGORY_NOT_FOUND', 'Category not found');
      }
      return category;
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw mapRepositoryError(error);
    }
  }

  deleteCategory(id: string) {
    if (!this.articleRepository.deleteCategory(id)) {
      throw notFound('CATEGORY_NOT_FOUND', 'Category not found');
    }
    return { deleted: true };
  }

  listTags(): Tag[] {
    return this.articleRepository.listTags();
  }

  createTag(input: CreateTagDto): Tag {
    try {
      return this.articleRepository.createTag(input);
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  updateTag(id: string, input: UpdateTagDto): Tag {
    try {
      const tag = this.articleRepository.updateTag(id, input);
      if (!tag) {
        throw notFound('TAG_NOT_FOUND', 'Tag not found');
      }
      return tag;
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw mapRepositoryError(error);
    }
  }

  deleteTag(id: string) {
    if (!this.articleRepository.deleteTag(id)) {
      throw notFound('TAG_NOT_FOUND', 'Tag not found');
    }
    return { deleted: true };
  }
}

function toSummary(article: Article): ArticleSummary {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    coverImage: article.coverImage,
    author: article.author,
    category: article.category,
    tags: article.tags,
    status: article.status,
    viewCount: normalizeViewCount(article.viewCount),
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    seoKeywords: article.seoKeywords,
    canonicalUrl: article.canonicalUrl,
    aiSummary: article.aiSummary,
    contentSummary: article.contentSummary,
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}

function toDetail(article: Article): ArticleDetail {
  return {
    ...article,
    viewCount: normalizeViewCount(article.viewCount),
  };
}

function normalizeViewCount(value: number): number {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function notFound(code: string, message: string) {
  return new ApiException(404, code, message);
}

function mapRepositoryError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'ARTICLE_SLUG_CONFLICT') {
      return new ApiException(409, 'ARTICLE_SLUG_CONFLICT', 'Article slug already exists');
    }
    if (error.message === 'CATEGORY_SLUG_CONFLICT') {
      return new ApiException(409, 'CATEGORY_SLUG_CONFLICT', 'Category slug already exists');
    }
    if (error.message === 'TAG_SLUG_CONFLICT') {
      return new ApiException(409, 'TAG_SLUG_CONFLICT', 'Tag slug already exists');
    }
  }

  return new ApiException(500, 'REPOSITORY_ERROR', 'Repository operation failed');
}
