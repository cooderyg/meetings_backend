import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MeetingService } from './meeting.service';
import {
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FindByIdMeetingResponseDto } from './dto/response/find-by-id-meeting-response.dto';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberId } from '../../shared/decorator';
import { PublishMeetingDto } from './dto/request/publish-meeting.dto';
import { CreateMeetingDto } from './dto/request/create-meeting.dto';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { FilterQuery } from '../../shared/dto/request/filter.query';
import { SortQuery } from '../../shared/dto/request/sort.query';
import {
  ApiStandardResponse,
  ErrorResponse,
} from '../../shared/decorator/api-standard-response.decorator';

@ApiTags('Meetings')
@ApiParam({
  name: 'workspaceId',
  example: 'e720eee0-2997-4d27-af68-d5de5b84f911',
})
@ApiExtraModels(ErrorResponse, FindByIdMeetingResponseDto)
@ApiBearerAuth()
@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspace/:workspaceId/meetings')
export class MeetingController {
  constructor(private readonly service: MeetingService) {}

  @Post()
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: CreateMeetingDto
  ) {
    return this.service.create(workspaceId, workspaceMemberId, body);
  }

  @Patch('publish/:id')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: PublishMeetingDto
  ) {
    return this.service.publish(id, workspaceId, workspaceMemberId, body);
  }

  @Get(':id')
  @ApiOkResponse({ type: () => FindByIdMeetingResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    return this.service.findById(id, workspaceId);
  }

  @Get()
  @ApiOperation({
    summary: '워크스페이스 미팅 목록 조회',
    description:
      '워크스페이스의 미팅 목록을 페이지네이션, 필터링, 정렬하여 조회합니다.',
  })
  @ApiStandardResponse(FindByIdMeetingResponseDto, {
    isArray: true,
    hasTotalCount: true,
  })
  async findByWorkspace(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() pagination: PaginationQuery,
    @Query() filter: FilterQuery,
    @Query() sort: SortQuery
  ) {
    return this.service.findByWorkspacePaginated(
      workspaceId,
      pagination,
      filter,
      sort
    );
  }

  @Get('drafts/my')
  @ApiOperation({
    summary: '나의 임시저장 미팅 목록 조회',
    description: '나의 임시저장 미팅 목록을 페이지네이션, 정렬하여 조회합니다.',
  })
  @ApiStandardResponse(FindByIdMeetingResponseDto, {
    isArray: true,
    hasTotalCount: true,
  })
  async findDraftMy(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Query() pagination: PaginationQuery,
    @Query() sort: SortQuery
  ) {
    return this.service.findDraftMyPaginated(
      workspaceId,
      workspaceMemberId,
      pagination,
      sort
    );
  }
}
