import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateWorkspaceInvitationDto {
  @ApiProperty({
    description: '초대받을 사용자의 이메일',
    example: 'newuser@example.com',
  })
  @IsEmail()
  inviteeEmail: string;

  @ApiProperty({
    description: '부여할 역할 ID',
    example: 1,
  })
  @IsNumber()
  roleId: number;

  @ApiProperty({
    description: '초대 만료 기간 (일 단위, 기본값 7일)',
    example: 7,
    required: false,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  expirationDays?: number;
}
