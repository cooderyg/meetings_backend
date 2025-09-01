import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiParam,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateMeetingParticipantDto } from './dto/create-meeting-participant.dto';
import { MeetingParticipantService } from './meeting-participant.service';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { ErrorResponse } from '../../shared/decorator/api-standard-response.decorator';
import { ApiEntity } from '../../shared/decorator/api-entity.decorator';
import { ApiDomainErrors } from '../../shared/decorator/api-domain-errors.decorator';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { MEETING_PARTICIPANT_DETAIL_FIELDS } from './constant/meeting-participant-fields';

@ApiTags('Meeting Participants')
@ApiParam({
  name: 'workspaceId',
  example: 'e720eee0-2997-4d27-af68-d5de5b84f911',
})
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspace/:workspaceId/meeting-participants')
export class MeetingParticipantController {
  constructor(private readonly service: MeetingParticipantService) {}

  @Post()
  @ApiOperation({
    summary: '미팅 참여자 추가',
    description: '미팅에 참여자를 추가합니다.',
  })
  @ApiEntity(MeetingParticipant, MEETING_PARTICIPANT_DETAIL_FIELDS, {
    description: '미팅 참여자가 성공적으로 추가되었습니다.',
  })
  @ApiDomainErrors('meetingParticipant.create', {
    includeCommon: true,
    description: '미팅 참여자 생성 중 발생할 수 있는 에러들',
  })
  async create(
    @Body() dto: CreateMeetingParticipantDto,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    return await this.service.create({ ...dto, workspaceId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '미팅 참여자 삭제',
    description: '미팅에서 참여자를 삭제합니다.',
  })
  @ApiResponse({
    status: 204,
    description: '미팅 참여자가 성공적으로 삭제되었습니다.',
  })
  @ApiParam({
    name: 'id',
    description: '미팅 참여자 고유 식별자',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiDomainErrors('meetingParticipant.delete', {
    includeCommon: true,
    description: '미팅 참여자 삭제 중 발생할 수 있는 에러들',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }
}
