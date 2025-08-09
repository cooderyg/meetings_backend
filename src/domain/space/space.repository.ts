import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Space } from './entity/space.entity';

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
      { resource: id },
      { populate: ['resource', 'workspace'] }
    );
  }

  async findByWorkspace(workspaceId: string): Promise<Space[]> {
    return await this.repository.find(
      { workspace: workspaceId },
      { populate: ['resource'] }
    );
  }

  async findByWorkspaceAndUserId(
    workspaceId: string,
    userId: string
  ): Promise<Space[]> {
    return await this.repository.find({
      workspace: workspaceId,
      resource: { owner: { user: userId } },
    });
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
