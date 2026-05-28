export type PhotoStatus = 'draft' | 'published' | 'hidden' | 'deleted';
export type MediaAssetStatus = 'pending' | 'ready' | 'failed' | 'deleted';
export type StorageProvider = 'mock' | 'static_url' | 'local' | 'cos';
export type MediaAccessPolicy = 'public' | 'private_signed' | 'admin_only';

export interface MediaAsset {
  id: string;
  provider: StorageProvider;
  bucket: string | null;
  region: string | null;
  objectKey: string | null;
  originalUrl: string | null;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  accessPolicy: MediaAccessPolicy;
  status: MediaAssetStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Photo {
  id: string;
  title: string;
  description: string | null;
  alt: string;
  mediaAssetId: string;
  thumbnailAssetId: string | null;
  categorySlug: string | null;
  tags: string[];
  takenAt: string | null;
  publishedAt: string | null;
  status: PhotoStatus;
  sortOrder: number;
  featured: boolean;
  relatedProject: string | null;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PhotoWithAssets extends Photo {
  mediaAsset: MediaAsset | null;
  thumbnailAsset: MediaAsset | null;
}

export interface PublicPhotoSummary {
  id: string;
  title: string;
  description: string | null;
  alt: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  tags: string[];
  category: string | null;
  takenAt: string | null;
  publishedAt: string | null;
  sortOrder: number;
  featured: boolean;
}

export interface PublicPhotoDetail extends PublicPhotoSummary {
  relatedProject: string | null;
  sourceNote: string | null;
  previousId: string | null;
  nextId: string | null;
}

export interface AdminPhotoDetail extends Photo {
  imageUrl: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  mediaAsset: MediaAsset | null;
  thumbnailAsset: MediaAsset | null;
}

export interface PhotoListFilters {
  page?: number;
  pageSize?: number;
  tag?: string;
  category?: string;
  year?: number;
  status?: PhotoStatus;
  keyword?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
