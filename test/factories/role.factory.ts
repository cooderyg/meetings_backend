import { Role } from '../../src/domain/role/entity/role.entity';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';

/**
 * Role 테스트 데이터 생성 Factory
 *
 * @example
 * const role = RoleFactory.create();
 * const systemRole = RoleFactory.createSystemRole(SystemRole.OWNER);
 */
export class RoleFactory {
  private static idCounter = 0;

  static create(overrides: Partial<Role> = {}): Role {
    const role = new Role();

    // 기본값 설정 (ID는 자동 증가)
    Object.assign(role, {
      id: overrides.id !== undefined ? overrides.id : ++this.idCounter,
      name: 'Test Role',
      description: 'Test role description',
      workspace: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    return role;
  }

  /**
   * 시스템 역할 생성
   */
  static createSystemRole(
    systemRole: SystemRole,
    overrides: Partial<Role> = {}
  ): Role {
    return this.create({
      ...overrides,
      name: systemRole,
      workspace: null,
      description: `System role: ${systemRole}`,
    });
  }

  /**
   * 워크스페이스별 역할 생성
   */
  static createWorkspaceRole(
    workspace: Workspace,
    overrides: Partial<Role> = {}
  ): Role {
    return this.create({
      ...overrides,
      workspace,
      name: overrides.name || 'Workspace Role',
      description: overrides.description || 'Workspace specific role',
    });
  }

  /**
   * 여러 Role 엔티티 생성
   */
  static createMany(count: number, overrides: Partial<Role> = {}): Role[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        id: index + 1,
        name: `Role ${index + 1}`,
      })
    );
  }
}
