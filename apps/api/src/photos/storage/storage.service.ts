import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { MediaAsset, StorageProvider } from '../types/photo.types';
import { CosStorageAdapter } from './cos-storage.adapter';
import { MockStorageAdapter } from './mock-storage.adapter';
import { DisplayUrl, UploadIntent, UploadIntentInput } from './storage.types';

@Injectable()
export class StorageService {
  constructor(
    private readonly mockStorageAdapter: MockStorageAdapter,
    private readonly cosStorageAdapter: CosStorageAdapter,
  ) {}

  createUploadIntent(input: UploadIntentInput): UploadIntent {
    this.assertAllowedUpload(input);
    return this.adapterFor(this.activeProvider()).createUploadIntent(input);
  }

  getDisplayUrl(asset: MediaAsset | null): DisplayUrl {
    if (!asset || asset.status !== 'ready' || asset.deletedAt) {
      return { url: null, expiresAt: null };
    }

    try {
      return this.adapterFor(asset.provider).getDisplayUrl(asset);
    } catch {
      return { url: null, expiresAt: null };
    }
  }

  activeProvider(): StorageProvider {
    const provider = process.env.PHOTO_STORAGE_PROVIDER;
    return provider === 'cos' || provider === 'local' || provider === 'static_url' || provider === 'mock'
      ? provider
      : 'mock';
  }

  private adapterFor(provider: StorageProvider) {
    if (provider === 'cos') return this.cosStorageAdapter;
    return this.mockStorageAdapter;
  }

  private assertAllowedUpload(input: UploadIntentInput) {
    if (!input.contentType.startsWith('image/')) {
      throw new ApiException(400, 'UPLOAD_POLICY_DENIED', 'Only image uploads are allowed');
    }

    const maxSizeBytes = Number(process.env.PHOTO_MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);
    if (input.sizeBytes > maxSizeBytes) {
      throw new ApiException(400, 'UPLOAD_POLICY_DENIED', 'Upload exceeds maximum allowed size');
    }
  }
}
