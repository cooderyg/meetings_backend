import { Injectable } from '@nestjs/common';
import { MeetingRepository } from './meeting.repository';
import { MeetingUpdate } from './meeting.type';
import { ResourceService } from '../resource/resource.service';
import {
  ResourceType,
  ResourceVisibility,
} from '../resource/entity/resource.entity';
import { CreateMeetingDto } from './dto/request/create-meeting.dto';
import { PublishMeetingDto } from './dto/request/publish-meeting.dto';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { AppError } from '../../shared/exception/app.error';

@Injectable()
export class MeetingService {
  constructor(
    private readonly repository: MeetingRepository,
    private readonly resourceService: ResourceService
  ) {}

  async create(
    workspaceId: string,
    workspaceMemberId: string,
    data: CreateMeetingDto
  ) {
    const { parentPath } = data;

    const resource = await this.resourceService.create({
      ownerId: workspaceMemberId,
      workspaceId,
      title: 'Untitled',
      type: ResourceType.MEETING,
      parentPath,
      visibility: ResourceVisibility.PUBLIC,
    });

    const meeting = await this.repository.create({
      resource,
      memo: null,
      status: MeetingStatus.DRAFT,
      tags: [],
      summary: null,
    });

    return meeting;
  }

  async update(id: string, data: MeetingUpdate): Promise<Meeting> {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }

  async publish(
    id: string,
    workspaceId: string,
    workspaceMemberId: string,
    data: PublishMeetingDto
  ): Promise<Meeting> {
    const { visibility } = data;

    // 조회
    const meeting = await this.findById(id, workspaceId);
    if (!meeting) {
      throw new AppError('meeting.fetch.notFound', { meetingId: id });
    }
    // 발행가능한지 확인()
    if (meeting.status !== MeetingStatus.COMPLETED) {
      throw new AppError('meeting.publish.isDraft', {
        currentStatus: meeting.status,
        requiredStatus: MeetingStatus.COMPLETED,
      });
    }

    await this.resourceService.update(id, { visibility });

    return await this.repository.update(id, {
      status: MeetingStatus.PUBLISHED,
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.repository.findById(id, workspaceId);
  }

  async findByWorkspace(workspaceId: string) {
    return this.repository.findByWorkspace(workspaceId);
  }

  async findDraftMy(workspaceId: string, workspaceMemberId: string) {
    return this.repository.findDrafyMy(workspaceId, workspaceMemberId);
  }
}
