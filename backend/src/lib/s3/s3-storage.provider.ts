import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  PresignedUpload,
  StorageProvider,
} from './storage-provider.interface';
import { DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS } from './s3.constants';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly expiresInSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.expiresInSeconds = Number(
      this.configService.get<string>('S3_PRESIGNED_URL_EXPIRES_IN_SECONDS') ??
        DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS,
    );
    // Credentials come from the default provider chain (the Lambda execution
    // role in AWS, a local AWS CLI profile in dev) — never a key/secret read
    // from this app's own config, per best-practices.md §Security.
    this.client = new S3Client({ region: this.region });
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: this.expiresInSeconds,
    });
    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { uploadUrl, fileUrl };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
