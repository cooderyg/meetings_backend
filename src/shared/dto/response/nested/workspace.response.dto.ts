import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceResponseDto {
  @ApiProperty({
    description: '워크스페이스 고유 식별자',
    type: 'string',
    format: 'uuid',
    example: 'e720eee0-2997-4d27-af68-d5de5b84f911',
    readOnly: true,
  })
  id: string;

  @ApiProperty({
    description: '워크스페이스 이름 (최대 100자)',
    type: 'string',
    example: '홍길동 워크스페이스',
    maxLength: 100,
    minLength: 1,
  })
  name: string;

  @ApiProperty({
    description: '생성일시',
    type: 'string',
    format: 'date-time',
    example: '2025-08-30T09:28:30.974Z',
    readOnly: true,
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정일시',
    type: 'string',
    format: 'date-time',
    example: '2025-08-30T09:28:30.974Z',
    readOnly: true,
  })
  updatedAt: Date;
}
