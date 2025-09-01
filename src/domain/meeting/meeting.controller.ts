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
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberId } from '../../shared/decorator';
import { PublishMeetingDto } from './dto/request/publish-meeting.dto';
import { CreateMeetingDto } from './dto/request/create-meeting.dto';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { FilterQuery } from '../../shared/dto/request/filter.query';
import { SortQuery } from '../../shared/dto/request/sort.query';
import { ErrorResponse } from '../../shared/decorator/api-standard-response.decorator';
import {
  ApiEntity,
  ApiEntityPaginated,
} from '../../shared/decorator/api-entity.decorator';
import {
  ApiDomainErrors,
  ApiCommonErrors,
} from '../../shared/decorator/api-domain-errors.decorator';
import { Meeting } from './entity/meeting.entity';
import {
  MEETING_LIST_FIELDS,
  MEETING_DETAIL_FIELDS,
  MEETING_DRAFT_FIELDS,
} from './constant/meeting-fields';

@ApiTags('Meetings')
@ApiParam({
  name: 'workspaceId',
  example: 'e720eee0-2997-4d27-af68-d5de5b84f911',
})
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspace/:workspaceId/meetings')
export class MeetingController {
  constructor(private readonly service: MeetingService) {}

  @Post()
  @ApiEntity(Meeting, MEETING_DETAIL_FIELDS, {
    description: '미팅을 생성합니다.',
  })
  @ApiCommonErrors()
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: CreateMeetingDto
  ) {
    return this.service.create({
      workspaceId,
      workspaceMemberId,
      parentPath: body.parentPath,
    });
  }

  @Patch('publish/:id')
  @ApiEntity(Meeting, MEETING_DETAIL_FIELDS, {
    description: '미팅을 발행합니다.',
  })
  @ApiDomainErrors('meeting.publish', {
    includeCommon: true,
    description: '미팅 발행 중 발생할 수 있는 에러들',
  })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: PublishMeetingDto
  ) {
    return this.service.publish({
      id,
      workspaceId,
      workspaceMemberId,
      data: body,
    });
  }

  @Get(':id')
  @ApiEntity(Meeting, MEETING_DETAIL_FIELDS, {
    description: '미팅 상세 정보를 조회합니다.',
  })
  @ApiDomainErrors('meeting.fetch', {
    includeCommon: true,
    description: '미팅 조회 중 발생할 수 있는 에러들',
  })
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
  @ApiEntityPaginated(
    Meeting,
    MEETING_LIST_FIELDS,
    '워크스페이스 미팅 목록이 조회되었습니다.'
  )
  @ApiCommonErrors()
  async findByWorkspace(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() pagination: PaginationQuery,
    @Query() filter: FilterQuery,
    @Query() sort: SortQuery
  ) {
    return this.service.findByWorkspace(workspaceId, pagination, filter, sort);
  }

  @Get('drafts/my')
  @ApiOperation({
    summary: '나의 임시저장 미팅 목록 조회',
    description: '나의 임시저장 미팅 목록을 페이지네이션, 정렬하여 조회합니다.',
  })
  @ApiEntityPaginated(
    Meeting,
    MEETING_DRAFT_FIELDS,
    '나의 임시저장 미팅 목록이 조회되었습니다.'
  )
  @ApiCommonErrors()
  async findDraftMy(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Query() pagination: PaginationQuery,
    @Query() sort: SortQuery
  ) {
    return this.service.findDraftMy(
      workspaceId,
      workspaceMemberId,
      pagination,
      sort
    );
  }
}
