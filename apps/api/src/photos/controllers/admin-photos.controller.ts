import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CreatePhotoDto } from '../dto/create-photo.dto';
import { ListPhotosDto } from '../dto/list-photos.dto';
import { ReorderPhotosDto } from '../dto/reorder-photos.dto';
import { UpdatePhotoDto } from '../dto/update-photo.dto';
import { UpdatePhotoStatusDto } from '../dto/update-photo-status.dto';
import { PhotosService } from '../photos.service';

@Controller('admin/photos')
@UseGuards(AdminAuthGuard)
export class AdminPhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get()
  list(@Query() query: ListPhotosDto) {
    return this.photosService.listAdmin(query);
  }

  @Post()
  create(@Body() input: CreatePhotoDto) {
    return { photo: this.photosService.createPhoto(input) };
  }

  @Patch('reorder')
  reorder(@Body() input: ReorderPhotosDto) {
    return this.photosService.reorderPhotos(input);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return { photo: this.photosService.getAdminById(id) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdatePhotoDto) {
    return { photo: this.photosService.updatePhoto(id, input) };
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() input: UpdatePhotoStatusDto) {
    return { photo: this.photosService.updateStatus(id, input) };
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.photosService.deletePhoto(id);
  }
}
