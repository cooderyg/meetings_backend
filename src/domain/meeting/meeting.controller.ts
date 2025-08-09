import { Controller, Get, Param } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { MeetingFindByIdResponseDto } from './dto/response/meeting-find-by-id-response.dto';

@Controller('meetings')
export class MeetingController {
  constructor(private service: MeetingService) {}

  @Get(':id')
  @ApiOkResponse({ type: () => MeetingFindByIdResponseDto })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
