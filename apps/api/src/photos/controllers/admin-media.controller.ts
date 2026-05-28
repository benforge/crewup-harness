import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CompleteMediaUploadDto, RefreshMediaUrlDto, UploadSignatureDto } from '../dto/media.dto';
import { PhotosService } from '../photos.service';

@Controller('admin/media')
@UseGuards(AdminAuthGuard)
export class AdminMediaController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('upload-signature')
  createUploadSignature(@Body() input: UploadSignatureDto) {
    return this.photosService.createUploadSignature(input);
  }

  @Post('complete')
  completeUpload(@Body() input: CompleteMediaUploadDto) {
    return this.photosService.completeMediaUpload(input);
  }

  @Post('refresh-url')
  refreshUrl(@Body() input: RefreshMediaUrlDto) {
    return this.photosService.refreshMediaUrls(input);
  }
}
