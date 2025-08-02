import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../shared/exception/app.exception';
import { ERROR_CODES } from '../../../shared/const/error-code.const';
import { AppConfig } from '../../../shared/module/app-config/app-config';
import {
  IStorageService,
  UploadOptions,
  UploadResult,
} from '../interface/storage.interface';

@Injectable()
export class S3Service implements IStorageService {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly appConfig: AppConfig) {
    this.bucket = appConfig.storage.aws.bucket;
    this.s3Client = new S3Client({
      region: appConfig.storage.aws.region || 'ap-northeast-2',
      credentials:
        appConfig.storage.aws.accessKeyId &&
        appConfig.storage.aws.secretAccessKey
          ? {
              accessKeyId: appConfig.storage.aws.accessKeyId,
              secretAccessKey: appConfig.storage.aws.secretAccessKey,
            }
          : undefined,
    });
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options?.contentType || 'application/octet-stream',
        Metadata: options?.metadata,
        ACL: options?.acl,
      });

      await this.s3Client.send(command);

      const region = this.appConfig.storage.aws.region || 'ap-northeast-2';
      const url = `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
      this.logger.log(`File uploaded successfully: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw new AppException(ERROR_CODES.STORAGE_UPLOAD_FAILED, {
        message: `Failed to upload file: ${error.message}`,
        details: { key, error: error.message },
      });
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new AppException(ERROR_CODES.STORAGE_FILE_NOT_FOUND, {
          message: `File not found: ${key}`,
          details: { key },
        });
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download file: ${key}`, error);
      throw new AppException(ERROR_CODES.STORAGE_DOWNLOAD_FAILED, {
        message: `Failed to download file: ${error.message}`,
        details: { key, error: error.message },
      });
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw new AppException(ERROR_CODES.STORAGE_DELETE_FAILED, {
        message: `Failed to delete file: ${error.message}`,
        details: { key, error: error.message },
      });
    }
  }

  async getPresignedUrl(key: string, expires = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expires,
      });

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${key}`, error);
      throw new AppException(ERROR_CODES.STORAGE_PRESIGNED_URL_FAILED, {
        message: `Failed to generate presigned URL: ${error.message}`,
        details: { key, error: error.message },
      });
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }

      this.logger.error(`Failed to check file existence: ${key}`, error);
      throw new AppException(ERROR_CODES.STORAGE_CHECK_FAILED, {
        message: `Failed to check file existence: ${error.message}`,
        details: { key, error: error.message },
      });
    }
  }
}
