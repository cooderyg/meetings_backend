import { IsEnum } from 'class-validator';
import { ResourceVisibility } from '../../resource/entity/resource.entity';
import { ApiProperty } from '@nestjs/swagger';

export class PublishMeetingDto {
  @ApiProperty({
    description: 'public, private 설정',
    example: ResourceVisibility.PUBLIC,
  })
  @IsEnum(ResourceVisibility)
  visibility: ResourceVisibility;
}
