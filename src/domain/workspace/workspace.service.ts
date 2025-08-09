import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '../../shared/const';
import { AppException } from '../../shared/exception/app.exception';
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

  async createWorkspace(workspace: ICreateWorkspace, user: User) {
    const createdWorkspace = this.workspaceRepository.assign(
      new Workspace(),
      workspace
    );
    await this.em.flush();

    const role = await this.roleService.findSystemRoles(SystemRole.OWNER);
    if (!role) {
      throw new NotFoundException('Role not found'); //TODO: 커스텀 예외로 수정
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

  async updateWorkspaceName(id: string, data: UpdateWorkspaceNameDto) {
    const { name } = data;

    const workspace = await this.findById(id);

    if (!workspace) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);
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
