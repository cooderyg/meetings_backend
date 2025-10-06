import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { STORAGE_SERVICE, IStorageService } from '../../infrastructure/storage';
import { LoggerService } from '../../shared/module/logger/logger.service';
import { AppError } from '../../shared/exception/app.error';
import {
  FileUploadResult,
  FileValidationOptions,
} from './interface/file.interface';

describe('FileService', () => {
  let service: FileService;
  let storageService: IStorageService;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: STORAGE_SERVICE,
          useValue: {
            uploadFile: jest.fn(),
            getPresignedUrl: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    storageService = module.get<IStorageService>(STORAGE_SERVICE);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('파일을 성공적으로 업로드해야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('test file content'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const mockUploadResult = {
        key: 'uploads/1704067200000-a1b2c3d4-test-image.jpg',
        url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test-image.jpg',
      };

      const expectedResult: FileUploadResult = {
        key: mockUploadResult.key,
        url: mockUploadResult.url,
        originalName: mockFile.originalname,
        contentType: mockFile.mimetype,
        size: mockFile.size,
        uploadedAt: expect.any(Date),
      };

      (storageService.uploadFile as jest.Mock).mockResolvedValue(
        mockUploadResult
      );

      // When
      const result = await service.uploadFile(mockFile);

      // Then
      expect(result).toEqual(expectedResult);
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^uploads\/\d+-[a-f0-9]{8}-test_image\.jpg$/),
        mockFile.buffer,
        {
          contentType: mockFile.mimetype,
          metadata: {
            originalName: mockFile.originalname,
            size: mockFile.size.toString(),
            uploadedAt: expect.any(String),
          },
        }
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /File uploaded successfully: uploads\/\d+-[a-f0-9]{8}-test_image\.jpg$/
        ),
        'FileService'
      );
    });

    it('파일 크기가 초과하면 에러를 발생시켜야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'large-file.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB (기본 제한 10MB 초과)
        buffer: Buffer.from('large file content'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const options: FileValidationOptions = {
        maxSize: 10 * 1024 * 1024, // 10MB
      };

      // When & Then
      await expect(service.uploadFile(mockFile, options)).rejects.toThrow(
        AppError
      );
      await expect(service.uploadFile(mockFile, options)).rejects.toMatchObject(
        {
          code: 'validation.form.failed',
        }
      );
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('지원하지 않는 MIME 타입이면 에러를 발생시켜야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'application/x-executable',
        size: 1024000,
        buffer: Buffer.from('executable content'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const options: FileValidationOptions = {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      };

      // When & Then
      await expect(service.uploadFile(mockFile, options)).rejects.toThrow(
        AppError
      );
      await expect(service.uploadFile(mockFile, options)).rejects.toMatchObject(
        {
          code: 'validation.form.failed',
        }
      );
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('지원하지 않는 파일 확장자면 에러를 발생시켜야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024000,
        buffer: Buffer.from('executable content'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const options: FileValidationOptions = {
        allowedExtensions: ['.jpg', '.png', '.pdf'],
      };

      // When & Then
      await expect(service.uploadFile(mockFile, options)).rejects.toThrow(
        AppError
      );
      await expect(service.uploadFile(mockFile, options)).rejects.toMatchObject(
        {
          code: 'validation.form.failed',
        }
      );
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('빈 파일이면 에러를 발생시켜야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'empty-file.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 0,
        buffer: Buffer.alloc(0),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      // When & Then
      await expect(service.uploadFile(mockFile)).rejects.toThrow(AppError);
      await expect(service.uploadFile(mockFile)).rejects.toMatchObject({
        code: 'validation.form.failed',
      });
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('스토리지 업로드 실패 시 에러를 발생시켜야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('test file content'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const uploadError = new Error('Storage upload failed');
      (storageService.uploadFile as jest.Mock).mockRejectedValue(uploadError);

      // When & Then
      await expect(service.uploadFile(mockFile)).rejects.toThrow(AppError);
      await expect(service.uploadFile(mockFile)).rejects.toMatchObject({
        code: 'storage.upload.failed',
      });
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /Failed to upload file: uploads\/\d+-[a-f0-9]{8}-test_image\.jpg$/
        ),
        uploadError.stack,
        'FileService',
        expect.objectContaining({
          originalName: mockFile.originalname,
          size: mockFile.size,
          contentType: mockFile.mimetype,
          error: uploadError.message,
        })
      );
    });
  });

  describe('uploadMultipleFiles', () => {
    it('여러 파일을 성공적으로 업로드해야 함', async () => {
      // Given
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'test1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024000,
          buffer: Buffer.from('test file 1'),
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
        {
          fieldname: 'files',
          originalname: 'test2.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 2048000,
          buffer: Buffer.from('test file 2'),
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
      ];

      const mockUploadResults = [
        {
          key: 'uploads/1704067200000-a1b2c3d4-test1.jpg',
          url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test1.jpg',
        },
        {
          key: 'uploads/1704067200000-a1b2c3d4-test2.png',
          url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test2.png',
        },
      ];

      const expectedResults: FileUploadResult[] = [
        {
          key: mockUploadResults[0].key,
          url: mockUploadResults[0].url,
          originalName: mockFiles[0].originalname,
          contentType: mockFiles[0].mimetype,
          size: mockFiles[0].size,
          uploadedAt: expect.any(Date),
        },
        {
          key: mockUploadResults[1].key,
          url: mockUploadResults[1].url,
          originalName: mockFiles[1].originalname,
          contentType: mockFiles[1].mimetype,
          size: mockFiles[1].size,
          uploadedAt: expect.any(Date),
        },
      ];

      (storageService.uploadFile as jest.Mock)
        .mockResolvedValueOnce(mockUploadResults[0])
        .mockResolvedValueOnce(mockUploadResults[1]);

      // When
      const result = await service.uploadMultipleFiles(mockFiles);

      // Then
      expect(result).toEqual(expectedResults);
      expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(loggerService.info).toHaveBeenCalledWith(
        'Multiple files uploaded successfully: 2 files',
        'FileService',
        {
          fileCount: 2,
          totalSize: 3072000,
        }
      );
    });

    it('파일이 없으면 에러를 발생시켜야 함', async () => {
      // Given
      const mockFiles: Express.Multer.File[] = [];

      // When & Then
      await expect(service.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        AppError
      );
      await expect(
        service.uploadMultipleFiles(mockFiles)
      ).rejects.toMatchObject({
        code: 'validation.form.failed',
      });
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('null 파일 배열이면 에러를 발생시켜야 함', async () => {
      // Given
      const mockFiles = null as any;

      // When & Then
      await expect(service.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        AppError
      );
      await expect(
        service.uploadMultipleFiles(mockFiles)
      ).rejects.toMatchObject({
        code: 'validation.form.failed',
      });
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('getPresignedUrl', () => {
    it('Presigned URL을 성공적으로 생성해야 함', async () => {
      // Given
      const key = 'uploads/test-file.jpg';
      const expires = 3600;
      const expectedUrl =
        'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/test-file.jpg?X-Amz-Signature=...';

      (storageService.getPresignedUrl as jest.Mock).mockResolvedValue(
        expectedUrl
      );

      // When
      const result = await service.getPresignedUrl(key, expires);

      // Then
      expect(result).toBe(expectedUrl);
      expect(storageService.getPresignedUrl).toHaveBeenCalledWith(key, expires);
    });

    it('Presigned URL 생성 실패 시 에러를 발생시켜야 함', async () => {
      // Given
      const key = 'uploads/non-existent-file.jpg';
      const expires = 3600;
      const error = new Error('File not found');

      (storageService.getPresignedUrl as jest.Mock).mockRejectedValue(error);

      // When & Then
      await expect(service.getPresignedUrl(key, expires)).rejects.toThrow(
        AppError
      );
      await expect(service.getPresignedUrl(key, expires)).rejects.toMatchObject(
        {
          code: 'storage.presignedUrl.failed',
        }
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        `Failed to get presigned URL for: ${key}`,
        error.stack,
        'FileService',
        { key, error: error.message }
      );
    });
  });

  describe('deleteFile', () => {
    it('파일을 성공적으로 삭제해야 함', async () => {
      // Given
      const key = 'uploads/test-file.jpg';

      (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);

      // When
      await service.deleteFile(key);

      // Then
      expect(storageService.deleteFile).toHaveBeenCalledWith(key);
      expect(loggerService.info).toHaveBeenCalledWith(
        `File deleted successfully: ${key}`,
        'FileService'
      );
    });

    it('파일 삭제 실패 시 에러를 발생시켜야 함', async () => {
      // Given
      const key = 'uploads/non-existent-file.jpg';
      const error = new Error('File not found');

      (storageService.deleteFile as jest.Mock).mockRejectedValue(error);

      // When & Then
      await expect(service.deleteFile(key)).rejects.toThrow(AppError);
      await expect(service.deleteFile(key)).rejects.toMatchObject({
        code: 'storage.delete.failed',
      });
      expect(loggerService.error).toHaveBeenCalledWith(
        `Failed to delete file: ${key}`,
        error.stack,
        'FileService',
        { key, error: error.message }
      );
    });
  });

  describe('generateFileKey', () => {
    it('안전한 파일 키를 생성해야 함', async () => {
      // Given
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test file with spaces & special chars!.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('test file content'),
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      const mockUploadResult = {
        key: 'uploads/1704067200000-a1b2c3d4-test_file_with_spaces___special_chars_.jpg',
        url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test_file_with_spaces___special_chars_.jpg',
      };

      (storageService.uploadFile as jest.Mock).mockResolvedValue(
        mockUploadResult
      );

      // When
      await service.uploadFile(mockFile);

      // Then
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^uploads\/\d+-[a-f0-9]{8}-test_file_with_spaces___special_chars_\.jpg$/
        ),
        mockFile.buffer,
        expect.any(Object)
      );
    });
  });
});
