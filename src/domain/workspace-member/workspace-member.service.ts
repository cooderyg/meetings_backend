import { Injectable } from '@nestjs/common';
import { IWorkspaceMemberCreateData } from './interfaces/workspace-member-create-data.interface';
import { WorkspaceMemberRepository } from './workspace-member.repository';

@Injectable()
export class WorkspaceMemberService {
  constructor(private repository: WorkspaceMemberRepository) {}

  async createWorkspaceMember(args: IWorkspaceMemberCreateData) {
    return this.repository.create(args);
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  async findByWorkspace(workspaceId: string) {
    return this.repository.findByWorkspace(workspaceId);
  }

  async findByUserAndWorkspace(userId: string, workspaceId: string) {
    return this.repository.findByUserAndWorkspace(userId, workspaceId);
  }

  async isActiveMember(userId: string, workspaceId: string): Promise<boolean> {
    const member = await this.repository.findActiveByUserAndWorkspace(
      userId,
      workspaceId
    );
    return member !== null;
  }
}
