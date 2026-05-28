import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { CompleteMediaUploadDto, RefreshMediaUrlDto, UploadSignatureDto } from './dto/media.dto';
import { ListPhotosDto } from './dto/list-photos.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdatePhotoStatusDto } from './dto/update-photo-status.dto';
import { PHOTO_REPOSITORY, PhotoRepository } from './repositories/photo.repository';
import { StorageService } from './storage/storage.service';
import {
  AdminPhotoDetail,
  MediaAsset,
  PaginatedResult,
  PhotoListFilters,
  PhotoWithAssets,
  PublicPhotoDetail,
  PublicPhotoSummary,
} from './types/photo.types';

@Injectable()
export class PhotosService {
  constructor(
    @Inject(PHOTO_REPOSITORY)
    private readonly photoRepository: PhotoRepository,
    private readonly storageService: StorageService,
  ) {}

  listPublic(query: ListPhotosDto): PaginatedResult<PublicPhotoSummary> {
    const filters = normalizeFilters(query);
    const result = this.photoRepository.listPublished(filters);
    return {
      items: result.items.map((photo) => this.toPublicSummary(photo)),
      pagination: pagination(filters, result.total),
    };
  }

  getPublicById(id: string): PublicPhotoDetail {
    const photo = this.photoRepository.findPublishedById(id);
    if (!photo) {
      throw notFound();
    }

    const siblings = this.photoRepository.listPublished({ page: 1, pageSize: 1000 }).items;
    const index = siblings.findIndex((item) => item.id === id);
    return {
      ...this.toPublicSummary(photo),
      relatedProject: photo.relatedProject,
      sourceNote: photo.sourceNote,
      previousId: index > 0 ? siblings[index - 1].id : null,
      nextId: index >= 0 && index < siblings.length - 1 ? siblings[index + 1].id : null,
    };
  }

  listAdmin(query: ListPhotosDto): PaginatedResult<AdminPhotoDetail> {
    const filters = normalizeFilters(query);
    const result = this.photoRepository.listAll(filters);
    return {
      items: result.items.map((photo) => this.toAdminDetail(photo)),
      pagination: pagination(filters, result.total),
    };
  }

  getAdminById(id: string): AdminPhotoDetail {
    const photo = this.photoRepository.findById(id);
    if (!photo) throw notFound();
    return this.toAdminDetail(photo);
  }

  createPhoto(input: CreatePhotoDto): AdminPhotoDetail {
    try {
      const normalizedInput = this.resolveCreatePhotoInput(input);
      return this.toAdminDetail(this.photoRepository.createPhoto(normalizedInput));
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  updatePhoto(id: string, input: UpdatePhotoDto): AdminPhotoDetail {
    try {
      const normalizedInput = this.resolveUpdatePhotoInput(input);
      const photo = this.photoRepository.updatePhoto(id, normalizedInput);
      if (!photo) throw notFound();
      return this.toAdminDetail(photo);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw mapRepositoryError(error);
    }
  }

  updateStatus(id: string, input: UpdatePhotoStatusDto): AdminPhotoDetail {
    const photo = this.photoRepository.updateStatus(id, input.status, input.publishedAt);
    if (!photo) throw notFound();
    return this.toAdminDetail(photo);
  }

  deletePhoto(id: string) {
    if (!this.photoRepository.softDeletePhoto(id)) throw notFound();
    return { deleted: true };
  }

  reorderPhotos(input: ReorderPhotosDto) {
    try {
      return { items: this.photoRepository.reorderPhotos(input.items).map((photo) => this.toAdminDetail(photo)) };
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  createUploadSignature(input: UploadSignatureDto) {
    const intent = this.storageService.createUploadIntent({
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      purpose: input.purpose ?? 'photo-original',
    });

    return {
      ...intent,
      secretExposed: false,
    };
  }

  completeMediaUpload(input: CompleteMediaUploadDto) {
    const provider = input.provider ?? (input.originalUrl ? 'static_url' : this.storageService.activeProvider());
    const asset = this.photoRepository.createMediaAsset({ ...input, provider });
    const displayUrl = this.storageService.getDisplayUrl(asset);
    return {
      mediaAssetId: asset.id,
      previewUrl: displayUrl.url,
      expiresAt: displayUrl.expiresAt,
      status: asset.status,
      provider: asset.provider,
    };
  }

  refreshMediaUrls(input: RefreshMediaUrlDto) {
    const assets = [
      ...this.photoRepository.findMediaAssetsByIds(input.mediaAssetIds ?? []),
      ...this.photoRepository.findMediaAssetsByObjectKeys(input.objectKeys ?? []),
    ];

    return {
      items: dedupeById(assets).map((asset) => {
        const displayUrl = this.storageService.getDisplayUrl(asset);
        return {
          mediaAssetId: asset.id,
          url: displayUrl.url,
          expiresAt: displayUrl.expiresAt,
          status: asset.status,
          errorCode: displayUrl.url ? null : 'MEDIA_NOT_READY',
        };
      }),
    };
  }

  private toPublicSummary(photo: PhotoWithAssets): PublicPhotoSummary {
    const imageUrl = this.storageService.getDisplayUrl(photo.mediaAsset);
    const thumbnailUrl = this.storageService.getDisplayUrl(photo.thumbnailAsset ?? photo.mediaAsset);
    return {
      id: photo.id,
      title: photo.title,
      description: photo.description,
      alt: photo.alt,
      imageUrl: imageUrl.url,
      thumbnailUrl: thumbnailUrl.url,
      width: photo.mediaAsset?.width ?? null,
      height: photo.mediaAsset?.height ?? null,
      tags: photo.tags,
      category: photo.categorySlug,
      takenAt: photo.takenAt,
      publishedAt: photo.publishedAt,
      sortOrder: photo.sortOrder,
      featured: photo.featured,
    };
  }

  private toAdminDetail(photo: PhotoWithAssets): AdminPhotoDetail {
    const imageUrl = this.storageService.getDisplayUrl(photo.mediaAsset);
    const thumbnailUrl = this.storageService.getDisplayUrl(photo.thumbnailAsset ?? photo.mediaAsset);
    return {
      ...photo,
      imageUrl: imageUrl.url,
      thumbnailUrl: thumbnailUrl.url,
      category: photo.categorySlug,
      mediaAsset: sanitizeAdminMedia(photo.mediaAsset),
      thumbnailAsset: sanitizeAdminMedia(photo.thumbnailAsset),
    };
  }

  private resolveCreatePhotoInput(input: CreatePhotoDto) {
    const mediaAssetId = input.mediaAssetId ?? this.createStaticMediaAsset(input.imageUrl, input.title).id;
    const thumbnailAssetId =
      input.thumbnailAssetId !== undefined
        ? input.thumbnailAssetId
        : input.thumbnailUrl
          ? this.createStaticMediaAsset(input.thumbnailUrl, input.title).id
          : null;

    return {
      title: input.title,
      description: input.description,
      alt: input.alt,
      mediaAssetId,
      thumbnailAssetId,
      categorySlug: input.categorySlug ?? input.category ?? null,
      tags: input.tags,
      takenAt: input.takenAt,
      publishedAt: input.publishedAt,
      status: input.status,
      sortOrder: input.sortOrder,
      featured: input.featured,
      relatedProject: input.relatedProject,
      sourceNote: input.sourceNote,
    };
  }

  private resolveUpdatePhotoInput(input: UpdatePhotoDto) {
    const mediaAssetId = input.mediaAssetId ?? (input.imageUrl ? this.createStaticMediaAsset(input.imageUrl, input.title).id : undefined);
    const thumbnailAssetId =
      input.thumbnailAssetId !== undefined
        ? input.thumbnailAssetId
        : input.thumbnailUrl === null
        ? null
        : input.thumbnailUrl
          ? this.createStaticMediaAsset(input.thumbnailUrl, input.title).id
          : undefined;
    const categorySlug = input.categorySlug !== undefined ? input.categorySlug : input.category;

    return {
      title: input.title,
      description: input.description,
      alt: input.alt,
      mediaAssetId,
      thumbnailAssetId,
      categorySlug,
      tags: input.tags,
      takenAt: input.takenAt,
      publishedAt: input.publishedAt,
      status: input.status,
      sortOrder: input.sortOrder,
      featured: input.featured,
      relatedProject: input.relatedProject,
      sourceNote: input.sourceNote,
    };
  }

  private createStaticMediaAsset(url: string | null | undefined, title: string | undefined): MediaAsset {
    if (!url) {
      throw new ApiException(400, 'PHOTO_IMAGE_REQUIRED', 'mediaAssetId or imageUrl is required');
    }

    return this.photoRepository.createMediaAsset({
      provider: 'static_url',
      originalUrl: url,
      mimeType: inferImageMimeType(url),
      sizeBytes: 1,
      originalFilename: title ? `${slugify(title)}.${inferImageExtension(url)}` : null,
      accessPolicy: 'public',
    });
  }
}

function normalizeFilters(query: ListPhotosDto): PhotoListFilters {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    tag: query.tag,
    category: query.category,
    year: query.year,
    status: query.status,
    keyword: query.keyword,
  };
}

function pagination(filters: PhotoListFilters, total: number) {
  return {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    total,
  };
}

function sanitizeAdminMedia(asset: MediaAsset | null): MediaAsset | null {
  if (!asset) return null;
  return {
    ...asset,
    bucket: asset.bucket ? 'configured' : null,
    region: asset.region ? 'configured' : null,
  };
}

function notFound() {
  return new ApiException(404, 'PHOTO_NOT_FOUND', 'Photo not found');
}

function mapRepositoryError(error: unknown) {
  if (error instanceof ApiException) return error;
  if (error instanceof Error) {
    if (error.message === 'PHOTO_NOT_FOUND') return notFound();
    if (error.message === 'MEDIA_NOT_READY') {
      return new ApiException(400, 'MEDIA_NOT_READY', 'Media asset is not ready or does not exist');
    }
  }

  return new ApiException(500, 'REPOSITORY_ERROR', 'Repository operation failed');
}

function dedupeById(assets: MediaAsset[]) {
  return [...new Map(assets.map((asset) => [asset.id, asset])).values()];
}

function inferImageMimeType(url: string) {
  const pathname = safeUrlPathname(url);
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

function inferImageExtension(url: string) {
  const mimeType = inferImageMimeType(url);
  return mimeType.replace('image/', '').replace('jpeg', 'jpg');
}

function safeUrlPathname(url: string) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'photo';
}
