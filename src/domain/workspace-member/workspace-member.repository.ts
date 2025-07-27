import { EntityRepository } from '@mikro-orm/core';
import { WorkspaceMember } from './entity/workspace-member.entity';

export class WorkspaceMemberRepository extends EntityRepository<WorkspaceMember> {
  async findById(id: string) {
    return await this.findOne({ id });
  }
}
