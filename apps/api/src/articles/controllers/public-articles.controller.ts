import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ArticlesService } from '../articles.service';

@Controller('articles')
export class PublicArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  listPublished() {
    return { items: this.articlesService.listPublished() };
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return { article: this.articlesService.getPublishedBySlug(slug) };
  }

  @Post(':slug/view')
  @HttpCode(200)
  recordView(@Param('slug') slug: string) {
    return this.articlesService.recordPublishedArticleView(slug);
  }
}

@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  listCategories() {
    return { items: this.articlesService.listCategories() };
  }

  @Get(':slug/articles')
  listArticlesByCategory(@Param('slug') slug: string) {
    return { items: this.articlesService.listPublishedByCategory(slug) };
  }
}

@Controller('tags')
export class PublicTagsController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  listTags() {
    return { items: this.articlesService.listTags() };
  }

  @Get(':slug/articles')
  listArticlesByTag(@Param('slug') slug: string) {
    return { items: this.articlesService.listPublishedByTag(slug) };
  }
}
