import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { MeetingFindByIdResponseDto } from './dto/response/meeting-find-by-id-response.dto';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberId } from '../../shared/decorator';
import { PublishMeetingDto } from './dto/request/publish-meeting.dto';
import { CreateMeetingDto } from './dto/request/create-meeting.dto';

@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/meetings')
export class MeetingController {
  constructor(private readonly service: MeetingService) {}

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: CreateMeetingDto
  ) {
    return this.service.create(workspaceId, workspaceMemberId, body);
  }

  @Patch('publish/:id')
  async publish(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: PublishMeetingDto
  ) {
    return this.service.publish(id, workspaceId, workspaceMemberId, body);
  }

  @Get(':id')
  @ApiOkResponse({ type: () => MeetingFindByIdResponseDto })
  async findById(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string
  ) {
    return this.service.findById(id, workspaceId);
  }

  @Get()
  async findByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.service.findByWorkspace(workspaceId);
  }

  @Get('drafts/my')
  async findDraftMy(
    @Param('workspaceId') workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string
  ) {
    return this.service.findDraftMy(workspaceId, workspaceMemberId);
  }
}
