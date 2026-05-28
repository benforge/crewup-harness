import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import {
  AdminArticlesController,
  AdminCategoriesController,
  AdminTagsController,
} from './controllers/admin-articles.controller';
import {
  PublicArticlesController,
  PublicCategoriesController,
  PublicTagsController,
} from './controllers/public-articles.controller';
import { ArticlesService } from './articles.service';
import { ARTICLE_REPOSITORY } from './repositories/article.repository';
import { InMemoryArticleRepository } from './repositories/in-memory-article.repository';

@Module({
  imports: [AuthModule],
  controllers: [
    PublicArticlesController,
    PublicCategoriesController,
    PublicTagsController,
    AdminArticlesController,
    AdminCategoriesController,
    AdminTagsController,
  ],
  providers: [
    ArticlesService,
    AdminAuthGuard,
    {
      provide: ARTICLE_REPOSITORY,
      useClass: InMemoryArticleRepository,
    },
  ],
})
export class ArticlesModule {}
