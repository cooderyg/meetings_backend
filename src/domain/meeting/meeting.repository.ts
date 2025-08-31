import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { findPaginated } from '../../shared/util/pagination.util';
import {
  MEETING_LIST_FIELDS,
  MEETING_DETAIL_FIELDS,
  MEETING_DRAFT_FIELDS,
  MEETING_WITH_PARTICIPANTS_FIELDS,
  MEETING_LIST_POPULATE,
  MEETING_DETAIL_POPULATE,
  MEETING_DRAFT_POPULATE,
  MEETING_WITH_PARTICIPANTS_POPULATE,
} from './constant/meeting-fields';
import { CreateMeetingData } from './interface/data/create-meeting.data';
import { UpdateMeetingData } from './interface/data/update-meeting.data';

@Injectable()
export class MeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private readonly repository: EntityRepository<Meeting>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(data: CreateMeetingData) {
    const entity = this.repository.assign(new Meeting(), data);
    await this.em.persistAndFlush(entity);
    await this.em.populate(entity, MEETING_DETAIL_POPULATE as any);
    return entity;
  }

  async update(id: string, data: UpdateMeetingData) {
    const entity = await this.repository.findOne(
      { id },
      {
        populate: MEETING_DETAIL_POPULATE as any,
        fields: MEETING_DETAIL_FIELDS as any,
      }
    );
    if (!entity) {
      throw new Error('Meeting not found');
    }
    const updateEntity = this.repository.assign(entity, data);
    await this.em.persistAndFlush(updateEntity);
    return entity;
  }

  async delete(id: string) {
    const entity = this.em.getReference(Meeting, id);
    const deleteEntity = this.repository.assign(entity, {
      deletedAt: new Date(),
    });
    await this.em.persistAndFlush(deleteEntity);
    return entity;
  }

  /**
   * 기본 미팅 상세 정보 조회 (참여자 제외)
   */
  async findById(id: string, workspaceId: string) {
    return this.repository.findOne(
      {
        id: id,
        workspace: workspaceId,
        deletedAt: null,
      },
      {
        populate: MEETING_DETAIL_POPULATE as any,
        fields: MEETING_DETAIL_FIELDS as any,
      }
    );
  }

  /**
   * 참여자 정보를 포함한 미팅 조회
   */
  async findByIdWithParticipants(id: string, workspaceId: string) {
    return this.repository.findOne(
      {
        id: id,
        workspace: workspaceId,
        deletedAt: null,
      },
      {
        populate: MEETING_WITH_PARTICIPANTS_POPULATE as any,
        fields: MEETING_WITH_PARTICIPANTS_FIELDS as any,
      }
    );
  }

  async findByWorkspace(workspaceId: string) {
    return this.repository.find(
      {
        workspace: workspaceId,
        status: { $ne: MeetingStatus.DRAFT },
        deletedAt: null,
      },
      {
        limit: 100,
        populate: MEETING_LIST_POPULATE as any,
        fields: MEETING_LIST_FIELDS as any,
      }
    );
  }

  async findDrafyMy(workspaceId: string, workspaceMemberId: string) {
    return this.repository.find(
      {
        workspace: workspaceId,
        status: MeetingStatus.DRAFT,
        resource: { owner: workspaceMemberId },
        deletedAt: null,
      },
      {
        limit: 100,
        populate: MEETING_DRAFT_POPULATE as any,
        fields: MEETING_DRAFT_FIELDS as any,
      }
    );
  }

  async findByWorkspacePaginated(
    workspaceId: string,
    pagination: PaginationQuery,
    filters?: FilterQuery<Meeting>,
    orderBy?: Record<string, 'ASC' | 'DESC'>
  ) {
    const where: FilterQuery<Meeting> = {
      workspace: workspaceId,
      status: { $ne: MeetingStatus.DRAFT },
      deletedAt: null,
    };

    // 필터가 있으면 병합
    if (filters) {
      Object.assign(where, filters);
    }

    return findPaginated(this.repository, pagination, {
      where,
      orderBy: orderBy || { createdAt: 'DESC' },
      populate: MEETING_LIST_POPULATE as any,
      fields: MEETING_LIST_FIELDS as any,
    });
  }

  async findDraftMyPaginated(
    workspaceId: string,
    workspaceMemberId: string,
    pagination: PaginationQuery,
    orderBy?: Record<string, 'ASC' | 'DESC'>
  ) {
    const where: FilterQuery<Meeting> = {
      workspace: workspaceId,
      status: MeetingStatus.DRAFT,
      resource: { owner: workspaceMemberId },
      deletedAt: null,
    };

    return findPaginated(this.repository, pagination, {
      where,
      orderBy: orderBy || { updatedAt: 'DESC' },
      populate: MEETING_DRAFT_POPULATE as any,
      fields: MEETING_DRAFT_FIELDS as any,
    });
  }
}
