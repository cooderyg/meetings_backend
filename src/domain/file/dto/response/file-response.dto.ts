import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({ 
    description: '파일 고유 키',
    example: 'uploads/1704067200000-a1b2c3d4-sample_image.jpg'
  })
  key: string;

  @ApiProperty({ 
    description: '파일 접근 URL',
    example: 'https://bucket.s3.ap-northeast-2.amazonaws.com/uploads/1704067200000-a1b2c3d4-sample_image.jpg'
  })
  url: string;

  @ApiProperty({ 
    description: '원본 파일명',
    example: 'sample_image.jpg'
  })
  originalName: string;

  @ApiProperty({ 
    description: '파일 MIME 타입',
    example: 'image/jpeg'
  })
  contentType: string;

  @ApiProperty({ 
    description: '파일 크기 (bytes)',
    example: 1024000
  })
  size: number;

  @ApiProperty({ 
    description: '업로드 시간',
    example: '2024-01-01T00:00:00.000Z'
  })
  uploadedAt: Date;
}

export class FileUploadSuccessResponseDto {
  @ApiProperty({ description: '업로드 성공 여부', example: true })
  success: true;

  @ApiProperty({ description: '업로드된 파일 정보', type: FileUploadResponseDto })
  file: FileUploadResponseDto;
}

export class FileUploadErrorResponseDto {
  @ApiProperty({ description: '업로드 성공 여부', example: false })
  success: false;

  @ApiProperty({ description: '에러 메시지' })
  error: string;

  @ApiProperty({ description: '에러 상세 정보', required: false })
  details?: any;
}