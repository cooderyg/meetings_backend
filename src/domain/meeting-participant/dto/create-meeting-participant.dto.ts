import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { IsEitherOr } from '../../../shared/validator/either-or.validator';

export class CreateMeetingParticipantDto {
  @ApiProperty({
    description: '미팅 고유 식별자',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4')
  meetingId: string;

  @ApiProperty({
    description: '미팅 참여자 고유 식별자',
    example: '886bd0c1-8ea0-4a31-ad31-481994bfc1ba',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  @IsEitherOr('meetingParticipantName', {
    message:
      'workspaceMemberId 또는 meetingParticipantName 중 하나는 반드시 입력해야 합니다.',
  })
  workspaceMemberId?: string;

  @ApiProperty({
    description: '미팅 참여자 이름',
    example: '홍길동',
    required: false,
  })
  @IsOptional()
  @IsString()
  guestName?: string;
}
