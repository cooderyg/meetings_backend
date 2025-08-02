import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SpaceRepository } from './space.repository';
import { Space } from './entity/space.entity';
import { Resource, ResourceType } from '../resource/entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { AppException } from '../../shared/exception/app.exception';
import { ERROR_CODES } from '../../shared/const';

export interface CreateSpaceDto {
  title: string;
  description?: string;
  workspaceId: string;
  ownerId: string;
  parentPath?: string;
}

export interface UpdateSpaceDto {
  title?: string;
  description?: string;
}

@Injectable()
export class SpaceService {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly em: EntityManager
  ) {}

  async findById(id: string): Promise<Space> {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);
    }
    return space;
  }

  async findByWorkspace(workspaceId: string): Promise<Space[]> {
    return await this.spaceRepository.findByWorkspace(workspaceId);
  }

  async create(dto: CreateSpaceDto): Promise<Space> {
    const workspace = this.em.assign(new Workspace(), { id: dto.workspaceId });
    const owner = this.em.assign(new WorkspaceMember(), { id: dto.ownerId });

    const resource = this.em.assign(new Resource(), {
      workspace,
      owner,
      type: ResourceType.SPACE,
      title: dto.title,
      path: dto.parentPath
        ? `${dto.parentPath}.${Date.now()}`
        : String(Date.now()),
    });

    const space = this.em.assign(new Space(), {
      resource,
      workspace,
      ...(dto.description !== undefined && { description: dto.description }),
    });

    const result = await this.spaceRepository.create(space);
    await this.em.flush();
    return result;
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findById(id);

    if (dto.title) {
      this.em.assign(space.resource, { title: dto.title });
    }

    if (dto.description !== undefined) {
      this.em.assign(space, { description: dto.description });
    }

    const result = await this.spaceRepository.update(space);
    await this.em.flush();
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.spaceRepository.delete(id);
    await this.em.flush();
  }
}
