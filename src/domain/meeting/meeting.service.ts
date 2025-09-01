import { Injectable } from '@nestjs/common';
import { MeetingRepository } from './meeting.repository';
import { ResourceService } from '../resource/resource.service';
import {
  ResourceType,
  ResourceVisibility,
} from '../resource/entity/resource.entity';
import { CreateMeetingArgs } from './interface/args/create-meeting.args';
import { PublishMeetingArgs } from './interface/args/publish-meeting.args';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { AppError } from '../../shared/exception/app.error';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { FilterQuery } from '../../shared/dto/request/filter.query';
import { SortQuery } from '../../shared/dto/request/sort.query';
import { UpdateMeetingData } from './interface/data/update-meeting.data';
@Injectable()
export class MeetingService {
  constructor(
    private readonly repository: MeetingRepository,
    private readonly resourceService: ResourceService
  ) {}

  async create(args: CreateMeetingArgs): Promise<Meeting> {
    const resource = await this.resourceService.create(
      {
        ownerId: args.workspaceMemberId,
        workspaceId: args.workspaceId,
        title: 'Untitled',
        type: ResourceType.MEETING,
        parentPath: args.parentPath,
        visibility: ResourceVisibility.PUBLIC,
      },
      { flush: false }
    );

    const meeting = await this.repository.create({
      resource,
      workspace: resource.workspace,
      memo: null,
      status: MeetingStatus.DRAFT,
      tags: [],
      summary: null,
    });

    return meeting;
  }

  async update(id: string, data: UpdateMeetingData) {
    const meeting = await this.repository.update(id, data);

    if (!meeting) {
      throw new AppError('meeting.update.notFound', { meetingId: id });
    }

    return meeting;
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }

  async publish(args: PublishMeetingArgs) {
    const { id, workspaceId, data } = args;
    const { visibility } = data;

    // 조회
    const meeting = await this.repository.findById(id, workspaceId);
    if (!meeting) {
      throw new AppError('meeting.publish.notFound', { meetingId: id });
    }
    // 발행가능한지 확인()
    if (meeting.status !== MeetingStatus.COMPLETED) {
      throw new AppError('meeting.publish.isDraft', {
        currentStatus: meeting.status,
        requiredStatus: MeetingStatus.COMPLETED,
      });
    }

    await this.resourceService.update(id, { visibility });

    // 이미 조회한 엔티티를 재사용하여 중복 조회 방지
    const updatedMeeting = await this.repository.updateEntity(meeting, {
      status: MeetingStatus.PUBLISHED,
    });

    return updatedMeeting;
  }

  /**
   * 기본 미팅 상세 정보 조회
   */
  async findById(id: string, workspaceId: string) {
    return this.repository.findById(id, workspaceId);
  }

  /**
   * 참여자 정보를 포함한 미팅 조회
   */
  async findByIdWithParticipants(id: string, workspaceId: string) {
    return this.repository.findByIdWithParticipants(id, workspaceId);
  }

  /**
   * 워크스페이스의 미팅 목록을 페이지네이션으로 조회
   */
  async findByWorkspace(
    workspaceId: string,
    pagination: PaginationQuery,
    filter?: FilterQuery,
    sort?: SortQuery
  ) {
    const filters = filter?.parseFilters<Meeting>();
    const orderBy = sort?.orderBy;

    const result = await this.repository.findByWorkspace(
      workspaceId,
      pagination,
      filters,
      orderBy
    );

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  }

  /**
   * 나의 임시저장 미팅 목록을 페이지네이션으로 조회
   */
  async findDraftMy(
    workspaceId: string,
    workspaceMemberId: string,
    pagination: PaginationQuery,
    sort?: SortQuery
  ) {
    const orderBy = sort?.orderBy;

    const result = await this.repository.findDraftMy(
      workspaceId,
      workspaceMemberId,
      pagination,
      orderBy
    );

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  }
}
