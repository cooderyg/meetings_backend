import { ApiProperty } from '@nestjs/swagger';
import { ResourceType, ResourceVisibility } from '../../../../domain/resource/entity/resource.entity';

export class OwnerResponseDto {
  @ApiProperty({
    description: '워크스페이스 멤버 고유 식별자',
    type: 'string',
    format: 'uuid',
    example: '886bd0c1-8ea0-4a31-ad31-481994bfc1ba',
    readOnly: true,
  })
  id: string;

  @ApiProperty({
    description: '사용자 이름 (최대 50자)',
    type: 'string',
    example: '홍길',
    maxLength: 50,
    minLength: 1,
  })
  firstName: string;

  @ApiProperty({
    description: '사용자 성 (최대 50자)',
    type: 'string',
    example: '동',
    maxLength: 50,
    minLength: 1,
  })
  lastName: string;

  @ApiProperty({
    description: '워크스페이스 멤버 활성화 상태',
    type: 'boolean',
    example: true,
    default: true,
  })
  isActive: boolean;
}

export class ResourceResponseDto {
  @ApiProperty({
    description: '리소스 고유 식별자',
    type: 'string',
    format: 'uuid',
    example: '1a695e8e-4ee5-4bb9-bde7-203b8d5dbbfa',
    readOnly: true,
  })
  id: string;

  @ApiProperty({
    description: '리소스 제목 (최대 255자)',
    type: 'string',
    example: 'My Meeting',
    maxLength: 255,
    minLength: 1,
  })
  title: string;

  @ApiProperty({
    description: '리소스 타입 (스페이스 또는 미팅)',
    enum: ResourceType,
    enumName: 'ResourceType',
    example: ResourceType.MEETING,
  })
  type: ResourceType;

  @ApiProperty({
    description: '리소스 가시성 (공개/비공개)',
    enum: ResourceVisibility,
    enumName: 'ResourceVisibility',
    example: ResourceVisibility.PUBLIC,
    default: ResourceVisibility.PUBLIC,
  })
  visibility: ResourceVisibility;

  @ApiProperty({
    description: 'LTree 계층 경로 (워크스페이스ID.타임스탬프 형식)',
    type: 'string',
    example: 'e720eee0-2997-4d27-af68-d5de5b84f911.1756546110974',
    pattern: '^[a-f0-9-]+(\.[0-9]+)*$',
  })
  path: string;

  @ApiProperty({
    description: '리소스 소유자 정보',
    type: OwnerResponseDto,
  })
  owner: OwnerResponseDto;

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