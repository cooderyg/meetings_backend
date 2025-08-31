import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { STORAGE_SERVICE, IStorageService } from '../../infrastructure/storage';
import { AppError } from '../../shared/exception/app.error';
import {
  FileUploadResult,
  FileValidationOptions,
  DEFAULT_FILE_VALIDATION,
} from './interface/file.interface';
import { LoggerService } from '../../shared/module/logger/logger.service';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly logger: LoggerService
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    options?: FileValidationOptions
  ): Promise<FileUploadResult> {
    const validationOptions = { ...DEFAULT_FILE_VALIDATION, ...options };

    // 파일 검증
    this.validateFile(file, validationOptions);

    // 고유한 파일 키 생성
    const fileKey = this.generateFileKey(file.originalname);

    try {
      // S3에 업로드
      const uploadResult = await this.storageService.uploadFile(
        fileKey,
        file.buffer,
        {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            size: file.size.toString(),
            uploadedAt: new Date().toISOString(),
          },
        }
      );

      this.logger.info(`File uploaded successfully: ${fileKey}`, 'FileService');

      return {
        key: uploadResult.key,
        url: uploadResult.url,
        originalName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file: ${fileKey}`,
        error.stack,
        'FileService',
        {
          originalName: file.originalname,
          size: file.size,
          contentType: file.mimetype,
          error: error.message,
        }
      );
      throw new AppError('storage.upload.failed');
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    options?: FileValidationOptions
  ): Promise<FileUploadResult[]> {
    if (!files || files.length === 0) {
      throw new AppError('validation.form.failed', {
        fields: { files: ['업로드할 파일이 없습니다'] },
      });
    }

    // 병렬로 업로드 처리
    const uploadPromises = files.map((file) => this.uploadFile(file, options));

    try {
      const results = await Promise.all(uploadPromises);
      this.logger.info(
        `Multiple files uploaded successfully: ${files.length} files`,
        'FileService',
        {
          fileCount: files.length,
          totalSize: results.reduce((sum, file) => sum + file.size, 0),
        }
      );
      return results;
    } catch (error) {
      this.logger.error(
        'Failed to upload multiple files',
        error.stack,
        'FileService',
        { fileCount: files.length, error: error.message }
      );
      throw error; // 개별 파일 업로드에서 이미 적절한 에러 처리됨
    }
  }

  async getPresignedUrl(key: string, expires?: number): Promise<string> {
    try {
      return await this.storageService.getPresignedUrl(key, expires);
    } catch (error) {
      this.logger.error(
        `Failed to get presigned URL for: ${key}`,
        error.stack,
        'FileService',
        { key, error: error.message }
      );
      throw new AppError('storage.presignedUrl.failed');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.storageService.deleteFile(key);
      this.logger.info(`File deleted successfully: ${key}`, 'FileService');
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${key}`,
        error.stack,
        'FileService',
        { key, error: error.message }
      );
      throw new AppError('storage.delete.failed');
    }
  }

  private validateFile(
    file: Express.Multer.File,
    options: FileValidationOptions
  ): void {
    // 파일 크기 검증
    if (options.maxSize && file.size > options.maxSize) {
      throw new AppError('validation.form.failed', {
        fields: {
          size: [
            `파일 크기가 너무 큽니다. 최대 ${Math.round(options.maxSize / 1024 / 1024)}MB까지 허용됩니다.`,
          ],
        },
      });
    }

    // MIME 타입 검증
    if (
      options.allowedMimeTypes &&
      !options.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new AppError('validation.form.failed', {
        fields: {
          mimetype: [
            `지원하지 않는 파일 형식입니다. 허용된 형식: ${options.allowedMimeTypes.join(', ')}`,
          ],
        },
      });
    }

    // 파일 확장자 검증
    if (options.allowedExtensions) {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (!options.allowedExtensions.includes(fileExtension)) {
        throw new AppError('validation.form.failed', {
          fields: {
            extension: [
              `지원하지 않는 파일 확장자입니다. 허용된 확장자: ${options.allowedExtensions.join(', ')}`,
            ],
          },
        });
      }
    }

    // 기본 검증
    if (!file.buffer || file.buffer.length === 0) {
      throw new AppError('validation.form.failed', {
        fields: { file: ['빈 파일은 업로드할 수 없습니다'] },
      });
    }
  }

  private generateFileKey(originalName: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);

    // 안전한 파일명 생성 (특수문자 제거)
    const safeName = baseName.replace(/[^a-zA-Z0-9가-힣]/g, '_');

    return `uploads/${timestamp}-${uuid}-${safeName}${extension}`;
  }
}
