import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../../shared/const';
import { AppException } from '../../shared/exception/app.exception';
import { Resource, ResourceType } from '../resource/entity/resource.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { Space } from './entity/space.entity';
import { CreateSpaceArgs } from './interfaces/args/create-space.args';
import { SpaceRepository } from './space.repository';

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

  async findByWorkspaceAndUserId(
    workspaceId: string,
    userId: string
  ): Promise<Space[]> {
    return await this.spaceRepository.findByWorkspaceAndUserId(
      workspaceId,
      userId
    );
  }

  async create(args: CreateSpaceArgs): Promise<Space> {
    const workspace = await this.em.findOne(Workspace, {
      id: args.workspaceId,
    });
    if (!workspace) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const owner = await this.em.findOne(WorkspaceMember, {
      user: args.userId,
      workspace: args.workspaceId,
    });
    if (!owner) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const resource = this.em.assign(new Resource(), {
      workspace,
      owner,
      type: ResourceType.SPACE,
      title: args.title,
      path: args.parentPath
        ? `${args.parentPath}.${Date.now()}`
        : String(Date.now()),
    });

    const space = this.em.assign(new Space(), {
      resource,
      workspace,
      ...(args.description !== undefined && { description: args.description }),
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
