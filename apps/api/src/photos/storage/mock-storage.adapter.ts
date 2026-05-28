import { Injectable } from '@nestjs/common';
import { MediaAsset } from '../types/photo.types';
import { DisplayUrl, StorageAdapter, UploadIntent, UploadIntentInput } from './storage.types';

@Injectable()
export class MockStorageAdapter implements StorageAdapter {
  readonly provider = 'mock' as const;

  createUploadIntent(input: UploadIntentInput): UploadIntent {
    const objectKey = buildObjectKey(input.purpose, input.filename);
    const expiresAtValue = buildExpiresAt();

    return {
      provider: this.provider,
      objectKey,
      uploadUrl: `/mock-storage/${objectKey}`,
      expiresAt: expiresAtValue,
      headers: {
        'content-type': input.contentType,
      },
      maxSizeBytes: maxUploadBytes(),
    };
  }

  getDisplayUrl(asset: MediaAsset): DisplayUrl {
    if (asset.originalUrl) {
      return { url: asset.originalUrl, expiresAt: null };
    }

    return {
      url: asset.objectKey ? `/mock-storage/${asset.objectKey}` : null,
      expiresAt: asset.accessPolicy === 'private_signed' ? buildExpiresAt() : null,
    };
  }
}

function buildObjectKey(purpose: string, filename: string) {
  const safeName = filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `photos/${purpose}/${date}/${Date.now()}-${safeName}`;
}

function buildExpiresAt() {
  return new Date(Date.now() + signedUrlTtlSeconds() * 1000).toISOString();
}

function signedUrlTtlSeconds() {
  return Number(process.env.PHOTO_SIGNED_URL_TTL_SECONDS ?? 900);
}

function maxUploadBytes() {
  return Number(process.env.PHOTO_MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);
}
