import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../../enum/invitation-status.enum';

export class InvitationDto {
  @ApiProperty({
    description: '초대 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '워크스페이스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  workspaceId: string;

  @ApiProperty({
    description: '스페이스 ID (워크스페이스 초대인 경우 null)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  spaceId: string | null;

  @ApiProperty({
    description: '초대받는 사람의 이메일',
    example: 'invitee@example.com',
  })
  inviteeEmail: string;

  @ApiProperty({
    description: '부여할 역할 ID',
    example: 1,
  })
  roleId: number;

  @ApiProperty({
    description: '초대 상태',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @ApiProperty({
    description: '초대 토큰',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  token: string;

  @ApiProperty({
    description: '초대 만료 시간',
    example: '2025-12-31T23:59:59Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: '초대를 생성한 사람의 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  inviterId: string;

  @ApiProperty({
    description: '생성 시간',
    example: '2025-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 시간',
    example: '2025-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
