import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({
    description: '워크스페이스 멤버 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  workspaceMemberId: string;

  @ApiProperty({
    description: '워크스페이스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  workspaceId: string;

  @ApiProperty({
    description: '초대 수락 성공 메시지',
    example: 'Invitation accepted successfully',
  })
  message: string;
}
