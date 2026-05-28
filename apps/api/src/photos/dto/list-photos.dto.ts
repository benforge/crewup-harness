import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PhotoStatus } from '../types/photo.types';

export class ListPhotosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(3000)
  year?: number;

  @IsOptional()
  @IsIn(['draft', 'published', 'hidden', 'deleted'])
  status?: PhotoStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}
