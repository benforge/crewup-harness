import { IsArray, IsOptional, IsString, IsUrl, Matches, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  summary: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

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
