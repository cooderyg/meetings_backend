import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { MeetingCreate, MeetingUpdate } from './meeting.type';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { findPaginated } from '../../shared/util/pagination.util';

@Injectable()
export class MeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private readonly repository: EntityRepository<Meeting>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(data: MeetingCreate) {
    const entity = this.repository.assign(new Meeting(), data);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async update(id: string, data: MeetingUpdate) {
    const entity = this.em.getReference(Meeting, id);
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

  async findById(id: string, workspaceId: string) {
    return this.repository.findOne({
      id: id,
      workspace: workspaceId,
      deletedAt: null,
    });
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
        populate: ['resource', 'resource.owner']
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
        populate: ['resource', 'resource.owner']
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
      populate: ['resource', 'resource.owner'] as any,
      fields: [
        'id', 'status', 'tags', 'createdAt', 'updatedAt',
        'resource.id', 'resource.title', 'resource.type', 'resource.visibility', 'resource.path',
        'resource.owner.id', 'resource.owner.firstName', 'resource.owner.lastName', 'resource.owner.isActive'
      ] as any,
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
      populate: ['resource', 'resource.owner'] as any,
      fields: [
        'id', 'status', 'tags', 'createdAt', 'updatedAt',
        'resource.id', 'resource.title', 'resource.type', 'resource.visibility', 'resource.path',
        'resource.owner.id', 'resource.owner.firstName', 'resource.owner.lastName', 'resource.owner.isActive'
      ] as any,
    });
  }
}
