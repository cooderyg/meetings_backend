export interface IStorageService {
  uploadFile(
    key: string,
    buffer: Buffer,
    options?: UploadOptions
  ): Promise<UploadResult>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getPresignedUrl(key: string, expires?: number): Promise<string>;
  fileExists(key: string): Promise<boolean>;
}

export interface UploadResult {
  key: string;
  url: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read' | 'public-read-write';
}

export interface StorageConfig {
  provider: 'AWS' | 'GCP';
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
