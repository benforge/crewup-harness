import { MediaAsset, StorageProvider } from '../types/photo.types';

export interface UploadIntentInput {
  filename: string;
  contentType: string;
  sizeBytes: number;
  purpose: 'photo-original' | 'photo-thumbnail';
}

export interface UploadIntent {
  provider: StorageProvider;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  headers: Record<string, string>;
  maxSizeBytes: number;
}

export interface DisplayUrl {
  url: string | null;
  expiresAt: string | null;
}

export interface StorageAdapter {
  readonly provider: StorageProvider;
  createUploadIntent(input: UploadIntentInput): UploadIntent;
  getDisplayUrl(asset: MediaAsset): DisplayUrl;
}
