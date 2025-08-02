import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { StorageModule } from '../../infrastructure/storage';

@Module({
  imports: [
    // Multer 전역 설정
    MulterModule.register({
      // MemoryStorage 사용 (기본값)
      // 파일을 메모리에 Buffer로 저장
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10, // 최대 10개 파일
      },
      fileFilter: (req, file, callback) => {
        // 허용할 MIME 타입들
        const allowedMimeTypes = [
          // Images
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          // Audio
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/flac',
          'audio/aac',
          // Video (작은 파일만)
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              `지원하지 않는 파일 형식입니다. 허용된 형식: ${allowedMimeTypes.join(', ')}`
            ),
            false
          );
        }
      },
    }),
    StorageModule, // StorageService 사용을 위해 import
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService], // 다른 모듈에서 사용할 수 있도록 export
})
export class FileModule {}
