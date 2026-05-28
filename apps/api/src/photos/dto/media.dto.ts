import {
  IsIn,
  IsInt,
  IsArray,
  IsMimeType,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { MediaAccessPolicy, StorageProvider } from '../types/photo.types';

export class UploadSignatureDto {
  @IsString()
  @MinLength(1)
  filename: string;

  @IsMimeType()
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes: number;

  @IsOptional()
  @IsIn(['photo-original', 'photo-thumbnail'])
  purpose?: 'photo-original' | 'photo-thumbnail';
}

export class CompleteMediaUploadDto {
  @IsOptional()
  @IsIn(['mock', 'static_url', 'local', 'cos'])
  provider?: StorageProvider;

  @IsOptional()
  @IsString()
  objectKey?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  originalUrl?: string | null;

  @IsMimeType()
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number | null;

  @IsOptional()
  @IsString()
  hash?: string | null;

  @IsOptional()
  @IsString()
  originalFilename?: string | null;

  @IsOptional()
  @IsIn(['public', 'private_signed', 'admin_only'])
  accessPolicy?: MediaAccessPolicy;
}

export class RefreshMediaUrlDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaAssetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectKeys?: string[];
}
