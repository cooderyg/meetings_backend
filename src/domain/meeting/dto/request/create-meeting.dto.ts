import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMeetingDto {
  @ApiProperty({ description: '부모 리소스 경로', example: 'spaceId' })
  @IsString()
  @IsNotEmpty()
  parentPath: string;
}
