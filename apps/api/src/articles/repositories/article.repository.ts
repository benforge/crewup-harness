import { CreateArticleDto } from '../dto/create-article.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { Article, ArticleStatus, Category, Tag } from '../types/article.types';

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');

export interface ArticleRepository {
  listPublished(): Article[];
  findPublishedBySlug(slug: string): Article | null;
  listPublishedByCategory(slug: string): Article[];
  listPublishedByTag(slug: string): Article[];
  listAll(status?: ArticleStatus): Article[];
  findById(id: string): Article | null;
  incrementViewCountBySlug(slug: string): Article | null;
  saveDraft(input: CreateArticleDto): Article;
  update(id: string, input: UpdateArticleDto): Article | null;
  publish(id: string, publishedAt?: string): Article | null;
  unpublish(id: string): Article | null;
  listCategories(): Category[];
  createCategory(input: CreateCategoryDto): Category;
  updateCategory(id: string, input: UpdateCategoryDto): Category | null;
  deleteCategory(id: string): boolean;
  listTags(): Tag[];
  createTag(input: CreateTagDto): Tag;
  updateTag(id: string, input: UpdateTagDto): Tag | null;
  deleteTag(id: string): boolean;
}
