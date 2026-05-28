import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { PhotoStatus } from '../types/photo.types';

export class UpdatePhotoStatusDto {
  @IsIn(['draft', 'published', 'hidden'])
  status: Exclude<PhotoStatus, 'deleted'>;

  @IsOptional()
  @IsISO8601()
  publishedAt?: string | null;
}
