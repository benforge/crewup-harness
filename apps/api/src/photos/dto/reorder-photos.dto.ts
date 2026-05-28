import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class ReorderPhotoItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderPhotosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderPhotoItemDto)
  items: ReorderPhotoItemDto[];
}
