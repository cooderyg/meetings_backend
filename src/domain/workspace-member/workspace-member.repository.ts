import { InjectRepository } from '@mikro-orm/nestjs';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';

@Injectable()
export class WorkspaceMemberRepository {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly repository: EntityRepository<WorkspaceMember>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async findById(id: string) {
    return await this.repository.findOne({ id });
  }
}
