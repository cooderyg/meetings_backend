import { Meeting } from '../../entity/meeting.entity';
import { ApiProperty } from '@nestjs/swagger';

export class FindByIdMeetingResponseDto {
  @ApiProperty({ description: '반환 데이터' })
  data: Meeting;
}
