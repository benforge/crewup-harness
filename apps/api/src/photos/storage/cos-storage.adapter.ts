import { Injectable } from '@nestjs/common';
import { MediaAsset } from '../types/photo.types';
import { DisplayUrl, StorageAdapter, UploadIntent, UploadIntentInput } from './storage.types';

@Injectable()
export class CosStorageAdapter implements StorageAdapter {
  readonly provider = 'cos' as const;

  createUploadIntent(input: UploadIntentInput): UploadIntent {
    const objectKey = buildObjectKey(input.purpose, input.filename);
    const expiresAtValue = buildExpiresAt();

    return {
      provider: this.provider,
      objectKey,
      uploadUrl: this.objectUrl(objectKey, 'upload'),
      expiresAt: expiresAtValue,
      headers: {
        'content-type': input.contentType,
        'x-cos-meta-purpose': input.purpose,
      },
      maxSizeBytes: maxUploadBytes(),
    };
  }

  getDisplayUrl(asset: MediaAsset): DisplayUrl {
    if (asset.originalUrl && asset.accessPolicy === 'public') {
      return { url: asset.originalUrl, expiresAt: null };
    }

    if (!asset.objectKey) {
      return { url: null, expiresAt: null };
    }

    return {
      url: this.objectUrl(asset.objectKey, 'read'),
      expiresAt: asset.accessPolicy === 'private_signed' ? buildExpiresAt() : null,
    };
  }

  private objectUrl(objectKey: string, action: 'read' | 'upload') {
    const protocol = process.env.COS_PROTOCOL ?? 'https';
    const bucket = process.env.COS_BUCKET ?? 'COS_BUCKET_PLACEHOLDER';
    const region = process.env.COS_REGION ?? 'COS_REGION_PLACEHOLDER';
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    return `${protocol}://${bucket}.cos.${region}.myqcloud.com/${encodedKey}?mockAction=${action}&mockSignature=server-generated`;
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
