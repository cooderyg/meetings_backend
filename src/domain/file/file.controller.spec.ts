import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileUploadResponseDto } from './dto/response/file-response.dto';
import { Readable } from 'stream';

describe('FileController', () => {
  let controller: FileController;
  let fileService: FileService;

  // Helper function to create mock Multer file
  const createMockFile = (
    overrides: Partial<Express.Multer.File> = {}
  ): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test'),
    stream: null as unknown as Readable,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: {
            uploadFile: jest.fn(),
            uploadMultipleFiles: jest.fn(),
            getPresignedUrl: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
    fileService = module.get<FileService>(FileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('단일 파일 업로드를 성공적으로 처리해야 함', async () => {
      // Given
      const mockFile = createMockFile({
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('test file content'),
      });

      const expectedResult: FileUploadResponseDto = {
        key: 'uploads/1704067200000-a1b2c3d4-test-image.jpg',
        url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test-image.jpg',
        originalName: 'test-image.jpg',
        contentType: 'image/jpeg',
        size: 1024000,
        uploadedAt: new Date(),
      };

      jest.spyOn(fileService, 'uploadFile').mockResolvedValue(expectedResult);

      // When
      const result = await controller.uploadFile(mockFile);

      // Then
      expect(result).toEqual({ file: expectedResult });
      expect(fileService.uploadFile).toHaveBeenCalledWith(mockFile);
    });

    it('파일이 없으면 BadRequestException을 발생시켜야 함', async () => {
      // Given
      const mockFile = undefined as unknown as Express.Multer.File;

      // When & Then
      await expect(controller.uploadFile(mockFile)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.uploadFile(mockFile)).rejects.toThrow(
        '업로드할 파일이 필요합니다'
      );
      expect(fileService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('uploadMultipleFiles', () => {
    it('다중 파일 업로드를 성공적으로 처리해야 함', async () => {
      // Given
      const mockFiles = [
        createMockFile({
          fieldname: 'files',
          originalname: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 1024000,
          buffer: Buffer.from('test file 1'),
        }),
        createMockFile({
          fieldname: 'files',
          originalname: 'test2.png',
          mimetype: 'image/png',
          size: 2048000,
          buffer: Buffer.from('test file 2'),
        }),
      ];

      const expectedResults: FileUploadResponseDto[] = [
        {
          key: 'uploads/1704067200000-a1b2c3d4-test1.jpg',
          url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test1.jpg',
          originalName: 'test1.jpg',
          contentType: 'image/jpeg',
          size: 1024000,
          uploadedAt: new Date(),
        },
        {
          key: 'uploads/1704067200000-a1b2c3d4-test2.png',
          url: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-test2.png',
          originalName: 'test2.png',
          contentType: 'image/png',
          size: 2048000,
          uploadedAt: new Date(),
        },
      ];

      jest
        .spyOn(fileService, 'uploadMultipleFiles')
        .mockResolvedValue(expectedResults);

      // When
      const result = await controller.uploadMultipleFiles(mockFiles);

      // Then
      expect(result).toEqual({
        files: expectedResults,
        summary: {
          totalFiles: 2,
          totalSize: 3072000,
        },
      });
      expect(fileService.uploadMultipleFiles).toHaveBeenCalledWith(mockFiles);
    });

    it('파일이 없으면 BadRequestException을 발생시켜야 함', async () => {
      // Given
      const mockFiles = undefined as unknown as Express.Multer.File[];

      // When & Then
      await expect(controller.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        '업로드할 파일이 없습니다'
      );
      expect(fileService.uploadMultipleFiles).not.toHaveBeenCalled();
    });

    it('빈 배열이면 BadRequestException을 발생시켜야 함', async () => {
      // Given
      const mockFiles: Express.Multer.File[] = [];

      // When & Then
      await expect(controller.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        '업로드할 파일이 없습니다'
      );
      expect(fileService.uploadMultipleFiles).not.toHaveBeenCalled();
    });
  });

  describe('getPresignedUrl', () => {
    it('Presigned URL을 성공적으로 생성해야 함', async () => {
      // Given
      const key = 'uploads/test-file.jpg';
      const expires = 3600;
      const expectedUrl =
        'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/test-file.jpg?X-Amz-Signature=...';

      jest.spyOn(fileService, 'getPresignedUrl').mockResolvedValue(expectedUrl);

      // When
      const result = await controller.getPresignedUrl(key, expires);

      // Then
      expect(result).toEqual({
        url: expectedUrl,
        expiresIn: expires,
      });
      expect(fileService.getPresignedUrl).toHaveBeenCalledWith(key, expires);
    });

    it('expires 파라미터가 없으면 기본값 3600을 사용해야 함', async () => {
      // Given
      const key = 'uploads/test-file.jpg';
      const expectedUrl =
        'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/test-file.jpg?X-Amz-Signature=...';

      jest.spyOn(fileService, 'getPresignedUrl').mockResolvedValue(expectedUrl);

      // When
      const result = await controller.getPresignedUrl(key);

      // Then
      expect(result).toEqual({
        url: expectedUrl,
        expiresIn: 3600,
      });
      expect(fileService.getPresignedUrl).toHaveBeenCalledWith(key, undefined);
    });

    it('URL 인코딩된 키를 디코딩해야 함', async () => {
      // Given
      const encodedKey = 'uploads%2Ftest%20file.jpg';
      const decodedKey = 'uploads/test file.jpg';
      const expectedUrl =
        'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/test%20file.jpg?X-Amz-Signature=...';

      jest.spyOn(fileService, 'getPresignedUrl').mockResolvedValue(expectedUrl);

      // When
      const result = await controller.getPresignedUrl(encodedKey);

      // Then
      expect(result).toEqual({
        url: expectedUrl,
        expiresIn: 3600,
      });
      expect(fileService.getPresignedUrl).toHaveBeenCalledWith(
        decodedKey,
        undefined
      );
    });
  });

  describe('deleteFile', () => {
    it('파일을 성공적으로 삭제해야 함', async () => {
      // Given
      const key = 'uploads/test-file.jpg';
      const decodedKey = 'uploads/test-file.jpg';

      jest.spyOn(fileService, 'deleteFile').mockResolvedValue(undefined);

      // When
      const result = await controller.deleteFile(key);

      // Then
      expect(result).toEqual({
        message: '파일이 성공적으로 삭제되었습니다.',
        key: decodedKey,
      });
      expect(fileService.deleteFile).toHaveBeenCalledWith(decodedKey);
    });

    it('URL 인코딩된 키를 디코딩해야 함', async () => {
      // Given
      const encodedKey = 'uploads%2Ftest%20file.jpg';
      const decodedKey = 'uploads/test file.jpg';

      jest.spyOn(fileService, 'deleteFile').mockResolvedValue(undefined);

      // When
      const result = await controller.deleteFile(encodedKey);

      // Then
      expect(result).toEqual({
        message: '파일이 성공적으로 삭제되었습니다.',
        key: decodedKey,
      });
      expect(fileService.deleteFile).toHaveBeenCalledWith(decodedKey);
    });
  });

  describe('getHealth', () => {
    it('서비스 상태를 올바르게 반환해야 함', () => {
      // When
      const result = controller.getHealth();

      // Then
      expect(result).toEqual({
        status: 'ok',
        service: 'file-service',
        timestamp: expect.any(String),
      });
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });
});
