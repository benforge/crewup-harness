import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { ArticlesService } from '../articles.service';
import { CreateArticleDto } from '../dto/create-article.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateTagDto } from '../dto/create-tag.dto';
import { PublishArticleDto } from '../dto/publish-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { ArticleStatus } from '../types/article.types';

@Controller('admin/articles')
@UseGuards(AdminAuthGuard)
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  listAll(@Query('status') status?: ArticleStatus) {
    return { items: this.articlesService.listAll(status) };
  }

  @Post()
  createDraft(@Body() input: CreateArticleDto) {
    return { article: this.articlesService.createDraft(input) };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return { article: this.articlesService.getById(id) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateArticleDto) {
    return { article: this.articlesService.update(id, input) };
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Body() input: PublishArticleDto) {
    return { article: this.articlesService.publish(id, input) };
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return { article: this.articlesService.unpublish(id) };
  }
}

@Controller('admin/categories')
@UseGuards(AdminAuthGuard)
export class AdminCategoriesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  listCategories() {
    return { items: this.articlesService.listCategories() };
  }

  @Post()
  createCategory(@Body() input: CreateCategoryDto) {
    return { category: this.articlesService.createCategory(input) };
  }

  @Patch(':id')
  updateCategory(@Param('id') id: string, @Body() input: UpdateCategoryDto) {
    return { category: this.articlesService.updateCategory(id, input) };
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.articlesService.deleteCategory(id);
  }
}

@Controller('admin/tags')
@UseGuards(AdminAuthGuard)
export class AdminTagsController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  listTags() {
    return { items: this.articlesService.listTags() };
  }

  @Post()
  createTag(@Body() input: CreateTagDto) {
    return { tag: this.articlesService.createTag(input) };
  }

  @Patch(':id')
  updateTag(@Param('id') id: string, @Body() input: UpdateTagDto) {
    return { tag: this.articlesService.updateTag(id, input) };
  }

  @Delete(':id')
  deleteTag(@Param('id') id: string) {
    return this.articlesService.deleteTag(id);
  }
}
