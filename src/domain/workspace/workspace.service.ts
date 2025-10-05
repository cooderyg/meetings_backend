import { EntityManager, Transactional } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AppError } from '../../shared/exception/app.error';
import { SystemRole } from '../role/enum/system-role.enum';
import { RoleService } from '../role/role.service';
import { User } from '../user/entity/user.entity';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { Workspace } from './entity/workspace.entity';
import { ICreateWorkspace } from './interfaces/create-workspace.interface';
import { WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly workspaceMemberService: WorkspaceMemberService,
    private readonly roleService: RoleService,
    private readonly em: EntityManager
  ) {}

  /**
   * Workspace 생성 (Workspace + WorkspaceMember 원자적 생성)
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async createWorkspace(workspace: ICreateWorkspace, user: User) {
    const createdWorkspace = this.workspaceRepository.assign(
      new Workspace(),
      workspace
    );

    const role = await this.roleService.findSystemRoles(SystemRole.OWNER);
    if (!role) {
      throw new AppError('role.system.notFound');
    }

    await this.workspaceMemberService.createWorkspaceMember({
      user: user,
      workspace: createdWorkspace,
      role: role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: true,
    });
    return createdWorkspace;
  }

  /**
   * Workspace 이름 업데이트
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async updateWorkspaceName(id: string, data: UpdateWorkspaceNameDto) {
    const { name } = data;

    const workspace = await this.findById(id);

    if (!workspace) {
      throw new AppError('workspace.fetch.notFound', { workspaceId: id });
    }

    workspace.name = name;

    await this.workspaceRepository.update(workspace);

    return name;
  }

  async findById(id: string) {
    return await this.workspaceRepository.findOne({ id });
  }

  async findByUserId(userId: string) {
    return await this.workspaceRepository.find({
      members: {
        user: userId,
      },
    });
  }
}
