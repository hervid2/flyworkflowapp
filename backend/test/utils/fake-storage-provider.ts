import type {
  PresignedUpload,
  StorageProvider,
} from '../../src/lib/s3/storage-provider.interface';

/** In-memory double for `S3StorageProvider` — no real AWS calls in e2e tests. */
export class FakeStorageProvider implements StorageProvider {
  readonly presignedCalls: { key: string; contentType: string }[] = [];
  readonly deletedKeys: string[] = [];

  getPresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    this.presignedCalls.push({ key, contentType });
    const fileUrl = `https://fake-bucket.s3.fake-region.amazonaws.com/${key}`;
    return Promise.resolve({
      uploadUrl: `${fileUrl}?X-Amz-Signature=fake`,
      fileUrl,
    });
  }

  deleteObject(key: string): Promise<void> {
    this.deletedKeys.push(key);
    return Promise.resolve();
  }
}
