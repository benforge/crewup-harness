import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { PhotoStatus } from '../types/photo.types';

export class UpdatePhotoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  alt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  mediaAssetId?: string;

  @IsOptional()
  @IsString()
  thumbnailAssetId?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  thumbnailUrl?: string | null;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsString()
  categorySlug?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsISO8601()
  takenAt?: string | null;

  @IsOptional()
  @IsISO8601()
  publishedAt?: string | null;

  @IsOptional()
  @IsIn(['draft', 'published', 'hidden'])
  status?: Exclude<PhotoStatus, 'deleted'>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  relatedProject?: string | null;

  @IsOptional()
  @IsString()
  sourceNote?: string | null;
}
