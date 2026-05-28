import { Injectable } from '@nestjs/common';
import { CompleteMediaUploadDto } from '../dto/media.dto';
import { ReorderPhotoItemDto } from '../dto/reorder-photos.dto';
import {
  MediaAsset,
  Photo,
  PhotoListFilters,
  PhotoStatus,
  PhotoWithAssets,
  StorageProvider,
} from '../types/photo.types';
import { CreatePhotoRepositoryInput, PhotoRepository, UpdatePhotoRepositoryInput } from './photo.repository';

@Injectable()
export class InMemoryPhotoRepository implements PhotoRepository {
  private readonly photos = new Map<string, Photo>();
  private readonly mediaAssets = new Map<string, MediaAsset>();

  constructor() {
    const now = new Date('2026-05-21T00:00:00.000Z').toISOString();
    const asset = this.createMediaAsset({
      provider: 'static_url',
      originalUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742',
      mimeType: 'image/jpeg',
      sizeBytes: 120000,
      width: 1200,
      height: 1600,
      hash: 'seed-photo-workbench',
      originalFilename: 'workbench.jpg',
      accessPolicy: 'public',
    });

    this.photos.set('photo-1', {
      id: 'photo-1',
      title: 'Workbench notes',
      description: 'A seeded photo record for the public photo wall API.',
      alt: 'Workbench with a laptop and notebook',
      mediaAssetId: asset.id,
      thumbnailAssetId: null,
      categorySlug: 'workspace',
      tags: ['workspace', 'engineering'],
      takenAt: '2026-05-20T10:00:00.000Z',
      publishedAt: now,
      status: 'published',
      sortOrder: 10,
      featured: true,
      relatedProject: null,
      sourceNote: 'Seeded static URL placeholder.',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  listPublished(filters: PhotoListFilters): { items: PhotoWithAssets[]; total: number } {
    return this.listFrom([...this.photos.values()].filter((photo) => photo.status === 'published' && !photo.deletedAt), filters);
  }

  listAll(filters: PhotoListFilters): { items: PhotoWithAssets[]; total: number } {
    return this.listFrom([...this.photos.values()].filter((photo) => !photo.deletedAt), filters);
  }

  findPublishedById(id: string): PhotoWithAssets | null {
    const photo = this.photos.get(id);
    if (!photo || photo.status !== 'published' || photo.deletedAt) return null;
    return this.withAssets(photo);
  }

  findById(id: string): PhotoWithAssets | null {
    const photo = this.photos.get(id);
    if (!photo || photo.deletedAt) return null;
    return this.withAssets(photo);
  }

  createPhoto(input: CreatePhotoRepositoryInput): PhotoWithAssets {
    this.assertReadyMedia(input.mediaAssetId);
    if (input.thumbnailAssetId) this.assertReadyMedia(input.thumbnailAssetId);

    const timestamp = new Date().toISOString();
    const status = input.status ?? 'draft';
    const photo: Photo = {
      id: `photo-${this.photos.size + 1}`,
      title: input.title,
      description: input.description ?? null,
      alt: input.alt,
      mediaAssetId: input.mediaAssetId,
      thumbnailAssetId: input.thumbnailAssetId ?? null,
      categorySlug: input.categorySlug ?? null,
      tags: input.tags ?? [],
      takenAt: input.takenAt ?? null,
      publishedAt: status === 'published' ? input.publishedAt ?? timestamp : input.publishedAt ?? null,
      status,
      sortOrder: input.sortOrder ?? 0,
      featured: input.featured ?? false,
      relatedProject: input.relatedProject ?? null,
      sourceNote: input.sourceNote ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    this.photos.set(photo.id, photo);
    return this.withAssets(photo);
  }

  updatePhoto(id: string, input: UpdatePhotoRepositoryInput): PhotoWithAssets | null {
    const existing = this.photos.get(id);
    if (!existing || existing.deletedAt) return null;
    if (input.mediaAssetId) this.assertReadyMedia(input.mediaAssetId);
    if (input.thumbnailAssetId) this.assertReadyMedia(input.thumbnailAssetId);

    const next: Photo = {
      ...existing,
      ...withoutUndefined(input),
      description: input.description === undefined ? existing.description : input.description,
      thumbnailAssetId: input.thumbnailAssetId === undefined ? existing.thumbnailAssetId : input.thumbnailAssetId,
      categorySlug: input.categorySlug === undefined ? existing.categorySlug : input.categorySlug,
      takenAt: input.takenAt === undefined ? existing.takenAt : input.takenAt,
      publishedAt: input.publishedAt === undefined ? existing.publishedAt : input.publishedAt,
      relatedProject: input.relatedProject === undefined ? existing.relatedProject : input.relatedProject,
      sourceNote: input.sourceNote === undefined ? existing.sourceNote : input.sourceNote,
      updatedAt: new Date().toISOString(),
    };

    if (next.status === 'published' && !next.publishedAt) {
      next.publishedAt = next.updatedAt;
    }

    this.photos.set(id, next);
    return this.withAssets(next);
  }

  updateStatus(id: string, status: Exclude<PhotoStatus, 'deleted'>, publishedAt?: string | null): PhotoWithAssets | null {
    const existing = this.photos.get(id);
    if (!existing || existing.deletedAt) return null;

    const timestamp = new Date().toISOString();
    const photo: Photo = {
      ...existing,
      status,
      publishedAt: status === 'published' ? publishedAt ?? existing.publishedAt ?? timestamp : publishedAt ?? null,
      updatedAt: timestamp,
    };

    this.photos.set(id, photo);
    return this.withAssets(photo);
  }

  softDeletePhoto(id: string): boolean {
    const existing = this.photos.get(id);
    if (!existing || existing.deletedAt) return false;
    const timestamp = new Date().toISOString();
    this.photos.set(id, { ...existing, status: 'deleted', deletedAt: timestamp, updatedAt: timestamp });
    return true;
  }

  reorderPhotos(items: ReorderPhotoItemDto[]): PhotoWithAssets[] {
    const missing = items.find((item) => {
      const photo = this.photos.get(item.id);
      return !photo || Boolean(photo.deletedAt);
    });
    if (missing) throw new Error('PHOTO_NOT_FOUND');

    const timestamp = new Date().toISOString();
    for (const item of items) {
      const photo = this.photos.get(item.id);
      if (photo) {
        this.photos.set(item.id, { ...photo, sortOrder: item.sortOrder, updatedAt: timestamp });
      }
    }

    return items.map((item) => this.withAssets(this.photos.get(item.id) as Photo));
  }

  createMediaAsset(input: CompleteMediaUploadDto): MediaAsset {
    const timestamp = new Date().toISOString();
    const provider = input.provider ?? (input.originalUrl ? 'static_url' : 'mock');
    const asset: MediaAsset = {
      id: `media-${this.mediaAssets.size + 1}`,
      provider,
      bucket: provider === 'cos' ? process.env.COS_BUCKET ?? null : null,
      region: provider === 'cos' ? process.env.COS_REGION ?? null : null,
      objectKey: input.objectKey ?? null,
      originalUrl: input.originalUrl ?? null,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      hash: input.hash ?? null,
      accessPolicy: input.accessPolicy ?? (provider === 'static_url' ? 'public' : 'private_signed'),
      status: 'ready',
      metadata: {
        originalFilename: input.originalFilename ?? null,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    this.mediaAssets.set(asset.id, asset);
    return asset;
  }

  findMediaAssetById(id: string): MediaAsset | null {
    return this.mediaAssets.get(id) ?? null;
  }

  findMediaAssetsByIds(ids: string[]): MediaAsset[] {
    return ids.map((id) => this.mediaAssets.get(id)).filter((asset): asset is MediaAsset => Boolean(asset));
  }

  findMediaAssetsByObjectKeys(objectKeys: string[]): MediaAsset[] {
    return [...this.mediaAssets.values()].filter(
      (asset) => asset.objectKey !== null && objectKeys.includes(asset.objectKey),
    );
  }

  private listFrom(photos: Photo[], filters: PhotoListFilters): { items: PhotoWithAssets[]; total: number } {
    const filtered = photos.filter((photo) => {
      if (filters.status && photo.status !== filters.status) return false;
      if (filters.tag && !photo.tags.includes(filters.tag)) return false;
      if (filters.category && photo.categorySlug !== filters.category) return false;
      if (filters.year && (!photo.takenAt || new Date(photo.takenAt).getUTCFullYear() !== filters.year)) return false;
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        return [photo.title, photo.description, photo.alt, photo.categorySlug, ...photo.tags]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(keyword));
      }
      return true;
    });

    const sorted = filtered.sort(comparePhotos);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize).map((photo) => this.withAssets(photo)),
      total: sorted.length,
    };
  }

  private withAssets(photo: Photo): PhotoWithAssets {
    return {
      ...photo,
      mediaAsset: this.mediaAssets.get(photo.mediaAssetId) ?? null,
      thumbnailAsset: photo.thumbnailAssetId ? this.mediaAssets.get(photo.thumbnailAssetId) ?? null : null,
    };
  }

  private assertReadyMedia(id: string) {
    const asset = this.mediaAssets.get(id);
    if (!asset || asset.status !== 'ready' || asset.deletedAt) {
      throw new Error('MEDIA_NOT_READY');
    }
  }
}

function comparePhotos(left: Photo, right: Photo) {
  if (right.sortOrder !== left.sortOrder) return right.sortOrder - left.sortOrder;
  const rightTaken = right.takenAt ? new Date(right.takenAt).getTime() : 0;
  const leftTaken = left.takenAt ? new Date(left.takenAt).getTime() : 0;
  if (rightTaken !== leftTaken) return rightTaken - leftTaken;
  const rightCreated = new Date(right.createdAt).getTime();
  const leftCreated = new Date(left.createdAt).getTime();
  if (rightCreated !== leftCreated) return rightCreated - leftCreated;
  return right.id.localeCompare(left.id);
}

function withoutUndefined(input: UpdatePhotoRepositoryInput): Partial<Photo> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<Photo>;
}
