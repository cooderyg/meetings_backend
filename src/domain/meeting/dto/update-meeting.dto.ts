import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { MeetingStatus } from '../entity/meeting.entity';

export class UpdateMeetingDto {
  @ApiPropertyOptional({
    description: '미팅 메모',
    example: '이번 회의는 중요한 안건을 다룹니다.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  memo?: string;

  @ApiPropertyOptional({
    description: '미팅 진행 상태',
    enum: MeetingStatus,
    example: MeetingStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @ApiPropertyOptional({
    description: '미팅 태그 목록',
    type: [String],
    example: ['중요', '주간회의', '기획'],
    isArray: true,
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'AI 생성 미팅 요약',
    example: '회의에서 논의된 주요 안건과 결정 사항입니다.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;
}
