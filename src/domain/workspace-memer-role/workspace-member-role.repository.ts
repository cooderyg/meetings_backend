import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { WorkspaceMemberRole } from './entity/workspace-member-role.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';

@Injectable()
export class WorkspaceMemberRoleRepository {
  constructor(
    @InjectRepository(WorkspaceMemberRole)
    private readonly repository: EntityRepository<WorkspaceMemberRole>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(workspaceMemberRole: WorkspaceMemberRole) {
    await this.em.persistAndFlush(workspaceMemberRole);

    return workspaceMemberRole;
  }
}
