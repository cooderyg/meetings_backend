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
    const workspace = new Workspace();
    workspace.id = dto.workspaceId;

    const owner = new WorkspaceMember();
    owner.id = dto.ownerId;

    const resource = new Resource();
    resource.workspace = workspace;
    resource.owner = owner;
    resource.type = ResourceType.SPACE;
    resource.title = dto.title;
    resource.path = dto.parentPath
      ? `${dto.parentPath}.${Date.now()}`
      : String(Date.now());

    const space = new Space();
    space.resource = resource;
    space.workspace = workspace;
    if (dto.description !== undefined) {
      space.description = dto.description;
    }

    const result = await this.spaceRepository.create(space);
    await this.em.flush();
    return result;
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findById(id);

    if (dto.title) {
      space.resource.title = dto.title;
    }

    if (dto.description !== undefined) {
      space.description = dto.description;
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
