import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Space } from './entity/space.entity';
import {
  SPACE_LIST_FIELDS,
  SPACE_DETAIL_FIELDS,
  SPACE_LIST_POPULATE,
  SPACE_DETAIL_POPULATE,
} from './constant/space-fields';

@Injectable()
export class SpaceRepository {
  em: EntityManager;

  constructor(
    @InjectRepository(Space)
    private readonly repository: EntityRepository<Space>
  ) {
    this.em = repository.getEntityManager();
  }

  async findById(id: string): Promise<Space | null> {
    return await this.repository.findOne(
      { id },
      {
        populate: SPACE_DETAIL_POPULATE as any,
        fields: SPACE_DETAIL_FIELDS as any,
      }
    );
  }

  async findByWorkspace(workspaceId: string): Promise<Space[]> {
    return await this.repository.find(
      { workspace: workspaceId },
      {
        populate: SPACE_LIST_POPULATE as any,
        fields: SPACE_LIST_FIELDS as any,
      }
    );
  }

  async findByWorkspaceAndUserId(
    workspaceId: string,
    userId: string
  ): Promise<Space[]> {
    return await this.repository.find(
      {
        workspace: workspaceId,
        resource: { owner: { user: userId } },
      },
      {
        populate: SPACE_LIST_POPULATE as any,
        fields: SPACE_LIST_FIELDS as any,
      }
    );
  }

  async create(data: Partial<Space>): Promise<Space> {
    const entity = this.repository.assign(new Space(), data);
    await this.em.persistAndFlush(entity);
    await this.em.populate(entity, SPACE_DETAIL_POPULATE as any);
    return entity;
  }

  async updateSpace(space: Space, data: Partial<Space>): Promise<Space> {
    this.repository.assign(space, data);
    await this.em.flush();
    return space;
  }

  async delete(id: string): Promise<void> {
    const space = await this.findById(id);
    if (space) {
      await this.em.removeAndFlush(space);
    }
  }
}
