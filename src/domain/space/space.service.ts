import { Injectable } from '@nestjs/common';
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

  async create(args: CreateSpaceArgs): Promise<Space> {
    // ResourceService를 통해 Resource 생성 (flush: false로 원자성 보장)
    const resource = await this.resourceService.create(
      {
        ownerId: args.workspaceMemberId,
        workspaceId: args.workspaceId,
        title: args.title,
        type: ResourceType.SPACE,
        parentPath: args.parentPath,
      },
      { flush: false }
    );

    // Space 생성 (Resource와 함께 flush)
    const space = await this.spaceRepository.create({
      resource,
      workspace: resource.workspace,
      ...(args.description !== undefined && { description: args.description }),
    });

    return space;
  }

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
