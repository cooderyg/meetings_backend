import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { IWorkspaceMemberCreateData } from './interfaces/workspace-member-create-data.interface';

export class WorkspaceMemberRepository {
  em: EntityManager;

  constructor(
    @InjectRepository(WorkspaceMember)
    private repository: EntityRepository<WorkspaceMember>
  ) {}

  async findById(id: string) {
    return this.repository.findOne({ id });
  }

  async create(data: IWorkspaceMemberCreateData) {
    const newWorkspaceMember = this.repository.assign(new WorkspaceMember(), {
      user: data.user,
      workspace: data.workspace,
      workspaceMemberRoles: [
        {
          role: data.role,
        },
      ],
      firstName: data.firstName,
      lastName: data.lastName,
    });
    await this.em.persistAndFlush(newWorkspaceMember);
    return newWorkspaceMember;
  }
}
