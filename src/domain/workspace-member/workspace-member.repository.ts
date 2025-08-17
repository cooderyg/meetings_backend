import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { IWorkspaceMemberCreateData } from './interfaces/workspace-member-create-data.interface';

@Injectable()
export class WorkspaceMemberRepository {
  constructor(
    @InjectRepository(WorkspaceMember)
    private repository: EntityRepository<WorkspaceMember>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(data: IWorkspaceMemberCreateData) {
    const entity = this.repository.assign(new WorkspaceMember(), {
      user: data.user,
      workspace: data.workspace,
      workspaceMemberRoles: [
        {
          role: data.role,
        },
      ],
      firstName: data.firstName,
      lastName: data.lastName,
      imagePath: data.imagePath,
      isActive: data.isActive,
    });
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async findById(id: string) {
    return this.repository.findOne({ id });
  }

  async findByUserAndWorkspace(userId: string, workspaceId: string) {
    return this.repository.findOne({
      user: userId,
      workspace: workspaceId,
    });
  }

  async findActiveByUserAndWorkspace(userId: string, workspaceId: string) {
    return this.repository.findOne({
      user: userId,
      workspace: workspaceId,
      isActive: true,
    });
  }
}
