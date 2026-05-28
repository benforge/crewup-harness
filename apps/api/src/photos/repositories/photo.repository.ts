import { CreatePhotoDto } from '../dto/create-photo.dto';
import { CompleteMediaUploadDto } from '../dto/media.dto';
import { ReorderPhotoItemDto } from '../dto/reorder-photos.dto';
import { UpdatePhotoDto } from '../dto/update-photo.dto';
import {
  MediaAsset,
  Photo,
  PhotoListFilters,
  PhotoStatus,
  PhotoWithAssets,
} from '../types/photo.types';

export type CreatePhotoRepositoryInput = Omit<CreatePhotoDto, 'imageUrl' | 'thumbnailUrl' | 'category'> & {
  mediaAssetId: string;
};

export type UpdatePhotoRepositoryInput = Omit<UpdatePhotoDto, 'imageUrl' | 'thumbnailUrl' | 'category'>;

export const PHOTO_REPOSITORY = Symbol('PHOTO_REPOSITORY');

export interface PhotoRepository {
  listPublished(filters: PhotoListFilters): { items: PhotoWithAssets[]; total: number };
  listAll(filters: PhotoListFilters): { items: PhotoWithAssets[]; total: number };
  findPublishedById(id: string): PhotoWithAssets | null;
  findById(id: string): PhotoWithAssets | null;
  createPhoto(input: CreatePhotoRepositoryInput): PhotoWithAssets;
  updatePhoto(id: string, input: UpdatePhotoRepositoryInput): PhotoWithAssets | null;
  updateStatus(id: string, status: Exclude<PhotoStatus, 'deleted'>, publishedAt?: string | null): PhotoWithAssets | null;
  softDeletePhoto(id: string): boolean;
  reorderPhotos(items: ReorderPhotoItemDto[]): PhotoWithAssets[];
  createMediaAsset(input: CompleteMediaUploadDto): MediaAsset;
  findMediaAssetById(id: string): MediaAsset | null;
  findMediaAssetsByIds(ids: string[]): MediaAsset[];
  findMediaAssetsByObjectKeys(objectKeys: string[]): MediaAsset[];
}
