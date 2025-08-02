import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileService } from './file.service';
import {
  UploadFileDto,
  UploadMultipleFilesDto,
} from './dto/request/upload-file.dto';
import {
  FileUploadResponseDto,
} from './dto/response/file-response.dto';

@ApiTags('Files')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({
    summary: '단일 파일 업로드',
    description:
      '단일 파일을 S3에 업로드합니다. 최대 10MB, 이미지/문서/오디오/비디오 파일을 지원합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '업로드할 파일',
    type: UploadFileDto,
  })
  @ApiOkResponse({
    description: '파일 업로드 성공',
    type: FileUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: '파일 업로드 실패 (파일 크기 초과, 지원하지 않는 파일 형식 등)',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('업로드할 파일이 필요합니다');
    }

    const result = await this.fileService.uploadFile(file);
    return { file: result };
  }

  @Post('upload-multiple')
  @ApiOperation({
    summary: '다중 파일 업로드',
    description:
      '여러 파일을 한 번에 S3에 업로드합니다. 각 파일은 최대 10MB까지 허용됩니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '업로드할 파일들',
    type: UploadMultipleFilesDto,
  })
  @ApiOkResponse({
    description: '다중 파일 업로드 성공',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { $ref: '#/components/schemas/FileUploadResponseDto' },
        },
        summary: {
          type: 'object',
          properties: {
            totalFiles: { type: 'number', example: 3 },
            totalSize: { type: 'number', example: 3072000 },
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // 최대 10개 파일
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('업로드할 파일이 없습니다');
    }

    const results = await this.fileService.uploadMultipleFiles(files);
    const totalSize = results.reduce((sum, file) => sum + file.size, 0);

    return {
      files: results,
      summary: {
        totalFiles: results.length,
        totalSize,
      },
    };
  }

  @Get(':key/presigned-url')
  @ApiOperation({
    summary: '파일 Presigned URL 생성',
    description: '파일에 대한 임시 접근 URL을 생성합니다. 기본 1시간 유효.',
  })
  @ApiParam({
    name: 'key',
    description:
      '파일 키 (예: uploads/1704067200000-a1b2c3d4-sample_image.jpg)',
    example: 'uploads/1704067200000-a1b2c3d4-sample_image.jpg',
  })
  @ApiQuery({
    name: 'expires',
    description: 'URL 만료 시간 (초 단위)',
    required: false,
    example: 3600,
  })
  @ApiOkResponse({
    description: 'Presigned URL 생성 성공',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/file.jpg?X-Amz-Signature=...',
        },
        expiresIn: { type: 'number', example: 3600 },
      },
    },
  })
  async getPresignedUrl(
    @Param('key') key: string,
    @Query('expires') expires?: number
  ) {
    // URL 디코딩 (슬래시 등이 인코딩된 경우)
    const decodedKey = decodeURIComponent(key);
    const url = await this.fileService.getPresignedUrl(decodedKey, expires);

    return {
      url,
      expiresIn: expires || 3600,
    };
  }

  @Delete(':key')
  @ApiOperation({
    summary: '파일 삭제',
    description: 'S3에서 파일을 삭제합니다.',
  })
  @ApiParam({
    name: 'key',
    description: '삭제할 파일 키',
    example: 'uploads/1704067200000-a1b2c3d4-sample_image.jpg',
  })
  @ApiOkResponse({
    description: '파일 삭제 성공',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: '파일이 성공적으로 삭제되었습니다.',
        },
        key: { 
          type: 'string',
          example: 'uploads/1704067200000-a1b2c3d4-sample_image.jpg'
        },
      },
    },
  })
  async deleteFile(@Param('key') key: string) {
    const decodedKey = decodeURIComponent(key);
    await this.fileService.deleteFile(decodedKey);

    return {
      message: '파일이 성공적으로 삭제되었습니다.',
      key: decodedKey,
    };
  }

  @Get('health')
  @ApiOperation({
    summary: '파일 서비스 상태 확인',
    description: '파일 업로드 서비스의 상태를 확인합니다.',
  })
  @ApiOkResponse({
    description: '서비스 상태 정상',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'file-service' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'file-service',
      timestamp: new Date().toISOString(),
    };
  }
}
