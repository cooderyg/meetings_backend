import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Resource } from './entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { ResourceType, ResourceVisibility } from './entity/resource.entity';

export interface CreateResourceData {
  workspace: Workspace;
  owner: WorkspaceMember;
  type: ResourceType;
  title: string;
  visibility?: ResourceVisibility;
  path: string;
}

export interface UpdateResourceData {
  title?: string;
  visibility?: ResourceVisibility;
}

export interface CreateResourceOptions {
  flush?: boolean;
}

@Injectable()
export class ResourceRepository {
  constructor(
    @InjectRepository(Resource)
    private readonly repository: EntityRepository<Resource>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(
    data: CreateResourceData,
    options: CreateResourceOptions = { flush: true }
  ): Promise<Resource> {
    const { visibility, ...rest } = data;

    const resource = new Resource();
    this.em.assign(resource, {
      ...rest,
      visibility: visibility || ResourceVisibility.PUBLIC,
    });

    if (options.flush) {
      await this.em.persistAndFlush(resource);
    } else {
      this.em.persist(resource);
    }

    return resource;
  }

  async findById(id: string): Promise<Resource | null> {
    return this.repository.findOne({ id });
  }

  async findByIdWithRelations(id: string): Promise<Resource | null> {
    return this.repository.findOne(
      { id },
      { populate: ['workspace', 'owner'] }
    );
  }

  async update(id: string, data: UpdateResourceData): Promise<Resource> {
    const resource = await this.repository.findOneOrFail({ id });
    this.repository.assign(resource, data);
    await this.em.flush();
    return resource;
  }

  async findByWorkspace(workspaceId: string): Promise<Resource[]> {
    return this.repository.find(
      { workspace: workspaceId },
      { populate: ['owner'] }
    );
  }

  async findByWorkspaceAndType(
    workspaceId: string,
    type: ResourceType
  ): Promise<Resource[]> {
    return this.repository.find(
      { workspace: workspaceId, type },
      { populate: ['owner'] }
    );
  }

  async findByOwner(ownerId: string): Promise<Resource[]> {
    return this.repository.find(
      { owner: ownerId },
      { populate: ['workspace'] }
    );
  }

  async delete(id: string): Promise<void> {
    const resource = await this.repository.findOne({ id });
    if (resource) {
      await this.em.removeAndFlush(resource);
    }
  }
}
