import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Space } from './entity/space.entity';

@Injectable()
export class SpaceRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Space | null> {
    return await this.em.findOne(
      Space,
      { resource: id },
      { populate: ['resource', 'workspace'] }
    );
  }

  async findByWorkspace(workspaceId: string): Promise<Space[]> {
    return await this.em.find(
      Space,
      { workspace: workspaceId },
      { populate: ['resource'] }
    );
  }

  async create(space: Space): Promise<Space> {
    this.em.persist(space);
    return space;
  }

  async update(space: Space): Promise<Space> {
    await this.em.flush();
    return space;
  }

  async delete(id: string): Promise<void> {
    const space = await this.findById(id);
    if (space) {
      this.em.remove(space);
    }
  }
}
 