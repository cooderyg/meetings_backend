import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberId } from '../../shared/decorator';
import { PublishMeetingDto } from './dto/publish-meeting.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '미팅 생성' })
  @ApiEntity(Meeting, MEETING_DETAIL_FIELDS, {
    description: '미팅을 생성합니다.',
  })
  @ApiCommonErrors()
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() body: CreateMeetingDto
  ) {
    return this.service.createMeeting({
      workspaceId,
      workspaceMemberId,
      parentPath: body.parentPath,
    });
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
  async findAll(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() pagination: PaginationQuery,
    @Query() filter: FilterQuery,
    @Query() sort: SortQuery
  ) {
    return this.service.findMeetingsByWorkspace(
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
    return this.service.findMyDraftMeetings(
      workspaceId,
      workspaceMemberId,
      pagination,
      sort
    );
  }

  @Patch('publish/:id')
  @ApiOperation({ summary: '미팅 발행' })
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
    return this.service.publishMeeting({
      id,
      workspaceId,
      workspaceMemberId,
      data: body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '미팅 삭제' })
  @ApiResponse({
    status: 204,
    description: '미팅이 성공적으로 삭제되었습니다.',
  })
  @ApiDomainErrors('meeting.delete', {
    includeCommon: true,
    description: '미팅 삭제 중 발생할 수 있는 에러들',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    // Note: workspaceId는 URL 파라미터로 받지만 현재 서비스에서는 id만으로 삭제
    // 향후 권한 검증이 필요할 경우 workspaceId 활용 가능
    await this.service.deleteMeeting(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '미팅 단일 조회' })
  @ApiEntity(Meeting, MEETING_DETAIL_FIELDS, {
    description: '미팅 상세 정보를 조회합니다.',
  })
  @ApiDomainErrors('meeting.fetch', {
    includeCommon: true,
    description: '미팅 조회 중 발생할 수 있는 에러들',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    return this.service.getMeetingById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '미팅 업데이트' })
  @ApiEntity(Meeting, MEETING_DETAIL_FIELDS, {
    description: '미팅을 업데이트합니다.',
  })
  @ApiDomainErrors('meeting.update', {
    includeCommon: true,
    description: '미팅 업데이트 중 발생할 수 있는 에러들',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() body: UpdateMeetingDto
  ) {
    // Note: workspaceId는 URL 파라미터로 받지만 현재 서비스에서는 id만으로 업데이트
    // 향후 권한 검증이 필요할 경우 workspaceId 활용 가능
    return this.service.updateMeeting(id, body);
  }
}
