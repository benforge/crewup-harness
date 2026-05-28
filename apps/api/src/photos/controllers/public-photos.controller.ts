import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListPhotosDto } from '../dto/list-photos.dto';
import { PhotosService } from '../photos.service';

@Controller('photos')
export class PublicPhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get()
  list(@Query() query: ListPhotosDto) {
    return this.photosService.listPublic(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return { photo: this.photosService.getPublicById(id) };
  }
}
