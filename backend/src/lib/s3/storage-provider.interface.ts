export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
}

/**
 * Abstraction over the object storage backend (`best-practices.md §NestJS`,
 * dependency inversion): business services depend on this interface, never
 * on `@aws-sdk/client-s3` directly, so they stay swappable/testable without
 * a real AWS account.
 */
export interface StorageProvider {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload>;
  deleteObject(key: string): Promise<void>;
}
