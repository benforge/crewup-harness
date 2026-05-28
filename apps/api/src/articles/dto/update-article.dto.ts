import { IsArray, IsIn, IsOptional, IsString, IsUrl, Matches, MinLength } from 'class-validator';
import { ArticleStatus } from '../types/article.types';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: ArticleStatus;

  @IsOptional()
  @IsString()
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  seoDescription?: string | null;

  @IsOptional()
  @IsString()
  seoKeywords?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  canonicalUrl?: string | null;

  @IsOptional()
  @IsString()
  aiSummary?: string | null;

  @IsOptional()
  @IsString()
  contentSummary?: string | null;
}
