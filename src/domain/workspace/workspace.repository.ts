import { EntityRepository } from '@mikro-orm/core';
import { Workspace } from './entity/workspace.entity';

export class WorkspaceRepository extends EntityRepository<Workspace> {
  async update(workspace: Workspace) {
    await this.em.persistAndFlush(workspace);
  }

  async findById(id: string) {
    return await this.findOne({ id });
  }
}
