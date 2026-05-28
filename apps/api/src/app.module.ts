import { Module } from '@nestjs/common';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { PhotosModule } from './photos/photos.module';

@Module({
  imports: [ArticlesModule, AuthModule, PhotosModule],
  controllers: [HealthController],
})
export class AppModule {}
