import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      '업로드할 파일 (최대 10MB, 이미지/문서/오디오/비디오 파일 지원)',
  })
  file: any;
}

export class UploadMultipleFilesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: '업로드할 파일들 (각각 최대 10MB)',
  })
  files: any[];
}
