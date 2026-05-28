import { IsDateString, IsOptional } from 'class-validator';

export class PublishArticleDto {
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
