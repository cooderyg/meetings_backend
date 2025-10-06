import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppError } from '../../shared/exception/app.error';
import { ResourceService } from '../resource/resource.service';
import { ResourceType } from '../resource/entity/resource.entity';
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
    private readonly em: EntityManager,
    private readonly spaceRepository: SpaceRepository,
    private readonly resourceService: ResourceService
  ) {}

  async findById(id: string): Promise<Space> {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new AppError('space.fetch.notFound');
    }
    return space;
  }

  async findByWorkspace(workspaceId: string): Promise<Space[]> {
    return this.spaceRepository.findByWorkspace(workspaceId);
  }

  async findByWorkspaceAndUserId(
    workspaceId: string,
    userId: string
  ): Promise<Space[]> {
    return this.spaceRepository.findByWorkspaceAndUserId(workspaceId, userId);
  }

  /**
   * Space 생성 (Resource와 함께 원자적으로 생성)
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async create(args: CreateSpaceArgs): Promise<Space> {
    const resource = await this.resourceService.create({
      ownerId: args.workspaceMemberId,
      workspaceId: args.workspaceId,
      title: args.title,
      type: ResourceType.SPACE,
      parentPath: args.parentPath,
    });

    const space = await this.spaceRepository.create({
      resource,
      workspace: resource.workspace,
      ...(args.description !== undefined && { description: args.description }),
    });

    return space;
  }

  /**
   * Space 업데이트 (title, description 수정)
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async update(id: string, dto: UpdateSpaceDto): Promise<Space> {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new AppError('space.fetch.notFound');
    }

    if (dto.title) {
      await this.resourceService.update(space.resource.id, {
        title: dto.title,
      });
    }

    let updatedSpace = space;
    if (dto.description !== undefined) {
      updatedSpace = await this.spaceRepository.updateSpace(space, {
        description: dto.description,
      });
    }

    return updatedSpace;
  }

  async delete(id: string): Promise<void> {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new AppError('space.fetch.notFound');
    }
    await this.spaceRepository.delete(id);
  }
}
