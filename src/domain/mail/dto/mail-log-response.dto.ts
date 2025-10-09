import { ApiProperty } from '@nestjs/swagger';
import { MailType } from '../enum/mail-type.enum';
import { MailStatus } from '../enum/mail-status.enum';
import { MailLog } from '../entity/mail-log.entity';

export class MailLogResponseDto {
  @ApiProperty({
    description: '메일 로그 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: '수신자 이메일',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: '메일 타입',
    enum: MailType,
    example: MailType.WELCOME,
  })
  type!: MailType;

  @ApiProperty({
    description: '메일 제목',
    example: 'John님, 환영합니다!',
  })
  subject!: string;

  @ApiProperty({
    description: '메일 상태',
    enum: MailStatus,
    example: MailStatus.SENT,
  })
  status!: MailStatus;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: '발송 일시',
    nullable: true,
    example: '2024-01-15T10:30:05Z',
  })
  sentAt?: Date;

  @ApiProperty({
    description: '에러 메시지',
    nullable: true,
    example: 'SMTP connection failed',
  })
  errorMessage?: string;

  @ApiProperty({
    description: '재시도 횟수',
    example: 0,
  })
  retryCount!: number;

  @ApiProperty({
    description: '사용자 정보',
    nullable: true,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  static fromEntity(entity: MailLog): MailLogResponseDto {
    const dto = new MailLogResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.type = entity.type;
    dto.subject = entity.subject;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.sentAt = entity.sentAt;
    dto.errorMessage = entity.errorMessage;
    dto.retryCount = entity.retryCount;

    if (entity.user) {
      dto.user = {
        id: entity.user.id,
        firstName: entity.user.firstName,
        lastName: entity.user.lastName,
        email: entity.user.email,
      };
    }

    return dto;
  }
}
