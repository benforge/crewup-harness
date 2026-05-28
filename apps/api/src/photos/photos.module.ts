import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { AdminMediaController } from './controllers/admin-media.controller';
import { AdminPhotosController } from './controllers/admin-photos.controller';
import { PublicPhotosController } from './controllers/public-photos.controller';
import { PhotosService } from './photos.service';
import { InMemoryPhotoRepository } from './repositories/in-memory-photo.repository';
import { PHOTO_REPOSITORY } from './repositories/photo.repository';
import { CosStorageAdapter } from './storage/cos-storage.adapter';
import { MockStorageAdapter } from './storage/mock-storage.adapter';
import { StorageService } from './storage/storage.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicPhotosController, AdminPhotosController, AdminMediaController],
  providers: [
    PhotosService,
    AdminAuthGuard,
    StorageService,
    MockStorageAdapter,
    CosStorageAdapter,
    {
      provide: PHOTO_REPOSITORY,
      useClass: InMemoryPhotoRepository,
    },
  ],
})
export class PhotosModule {}
