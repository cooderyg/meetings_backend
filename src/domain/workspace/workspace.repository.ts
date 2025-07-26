import { EntityRepository } from '@mikro-orm/core';
import { Workspace } from './entity/workspace.entity';

export class WorkspaceRepository extends EntityRepository<Workspace> {
  findById(id: string) {
    

  }
}
