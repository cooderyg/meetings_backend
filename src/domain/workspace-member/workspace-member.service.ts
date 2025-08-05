import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { IWorkspaceMemberCreateData } from './interfaces/workspace-member-create-data.interface';

export class WorkspaceMemberService {
  private readonly em: EntityManager;

  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: EntityRepository<WorkspaceMember>
  ) {
    this.em = workspaceMemberRepository.getEntityManager();
  }

  async findById(id: string) {
    return this.em.findOne(WorkspaceMember, { id });
  }

  async createWorkspaceMember(args: IWorkspaceMemberCreateData) {
    const newWorkspaceMember = this.workspaceMemberRepository.assign(
      new WorkspaceMember(),
      {
        user: args.user,
        workspace: args.workspace,
        workspaceMemberRoles: [
          {
            role: args.role,
          },
        ],
        firstName: args.firstName,
        lastName: args.lastName,
        imagePath: args.imagePath,
        isActive: args.isActive,
      }
    );
    await this.em.persistAndFlush(newWorkspaceMember);
    return newWorkspaceMember;
  }
}
