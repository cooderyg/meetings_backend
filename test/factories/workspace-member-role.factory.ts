import { WorkspaceMemberRole } from '../../src/domain/workspace-member-role/entity/workspace-member-role.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { Role } from '../../src/domain/role/entity/role.entity';
import { v4 as uuid } from 'uuid';

/**
 * WorkspaceMemberRole 테스트 데이터 생성 Factory
 */
export class WorkspaceMemberRoleFactory {
  /**
   * 단일 WorkspaceMemberRole 엔티티 생성
   */
  static create(overrides: Partial<WorkspaceMemberRole> = {}): WorkspaceMemberRole {
    const workspaceMemberRole = new WorkspaceMemberRole();

    Object.assign(workspaceMemberRole, {
      id: overrides.id || Math.floor(Math.random() * 10000),
      workspaceMember: overrides.workspaceMember || ({} as WorkspaceMember),
      role: overrides.role || ({} as Role),
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    });

    return workspaceMemberRole;
  }

  /**
   * 특정 멤버와 역할을 연결하는 WorkspaceMemberRole 생성
   */
  static createWithMemberAndRole(
    workspaceMember: WorkspaceMember,
    role: Role,
    overrides: Partial<WorkspaceMemberRole> = {}
  ): WorkspaceMemberRole {
    return this.create({
      workspaceMember,
      role,
      ...overrides,
    });
  }

  /**
   * Admin 역할을 가진 WorkspaceMemberRole 생성
   */
  static createAdminMemberRole(
    workspaceMember: WorkspaceMember,
    adminRole: Role,
    overrides: Partial<WorkspaceMemberRole> = {}
  ): WorkspaceMemberRole {
    return this.createWithMemberAndRole(workspaceMember, adminRole, overrides);
  }

  /**
   * Member 역할을 가진 WorkspaceMemberRole 생성
   */
  static createMemberRole(
    workspaceMember: WorkspaceMember,
    memberRole: Role,
    overrides: Partial<WorkspaceMemberRole> = {}
  ): WorkspaceMemberRole {
    return this.createWithMemberAndRole(workspaceMember, memberRole, overrides);
  }

  /**
   * 여러 WorkspaceMemberRole 엔티티 생성
   */
  static createMany(
    count: number,
    overrides: Partial<WorkspaceMemberRole> = {}
  ): WorkspaceMemberRole[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        id: index + 1,
      })
    );
  }

  /**
   * 멤버에게 여러 역할 부여
   */
  static createMultipleRolesForMember(
    workspaceMember: WorkspaceMember,
    roles: Role[]
  ): WorkspaceMemberRole[] {
    return roles.map((role, index) =>
      this.createWithMemberAndRole(workspaceMember, role, {
        id: index + 1,
      })
    );
  }
}