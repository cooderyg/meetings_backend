import { Injectable } from '@nestjs/common';
import { WorkspaceMemberRoleRepository } from './workspace-member-role.repository';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { Role } from '../role/entity/role.entity';
import { WorkspaceMemberRole } from './entity/workspace-member-role.entity';
import { RoleService } from '../role/role.service';
import { SystemRole } from '../role/enum/system-role.enum';
import { AppException } from '../../shared/exception/app.exception';
import { ERROR_CODES } from '../../shared/const';

@Injectable()
export class WorkspaceMemberRoleService {
  constructor(
    private readonly workspaceMemberRoleRepository: WorkspaceMemberRoleRepository,
    private readonly roleService: RoleService
  ) {}

  async create(workspaceMember: WorkspaceMember, role: Role) {
    const workspaceMemberRole = new WorkspaceMemberRole();

    workspaceMemberRole.workspaceMember = workspaceMember;
    workspaceMemberRole.role = role;

    await this.workspaceMemberRoleRepository.create(workspaceMemberRole);

    return workspaceMemberRole;
  }

  async createSystemWorkspaceMemberRole(
    roleName: SystemRole,
    workspaceMember: WorkspaceMember
  ) {
    const role = await this.roleService.findOneSystemRole(roleName);

    if (!role) throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);

    const workspaceMemberRole = await this.create(workspaceMember, role);

    return workspaceMemberRole;
  }
}
