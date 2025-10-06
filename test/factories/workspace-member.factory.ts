import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { User } from '../../src/domain/user/entity/user.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { v4 as uuid } from 'uuid';

/**
 * WorkspaceMember 테스트 데이터 생성 Factory
 *
 * @example
 * const workspaceMember = WorkspaceMemberFactory.create();
 * const workspaceMembers = WorkspaceMemberFactory.createMany(5);
 */
export class WorkspaceMemberFactory {
  static create(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
    const workspaceMember = new WorkspaceMember();

    // 기본값 설정
    Object.assign(workspaceMember, {
      id: uuid(),
      isActive: true,
      firstName: '길동',
      lastName: '홍',
      imagePath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    return workspaceMember;
  }

  /**
   * 여러 WorkspaceMember 엔티티 생성
   */
  static createMany(
    count: number,
    overrides: Partial<WorkspaceMember> = {}
  ): WorkspaceMember[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        firstName: `사용자${index + 1}`,
        lastName: '테스트',
      })
    );
  }

  /**
   * 특정 사용자와 워크스페이스로 워크스페이스 멤버 생성
   */
  static createWithUserAndWorkspace(
    user: User,
    workspace: Workspace,
    overrides: Partial<WorkspaceMember> = {}
  ): WorkspaceMember {
    return this.create({
      ...overrides,
      user,
      workspace,
    });
  }

  /**
   * 비활성화된 워크스페이스 멤버 생성
   */
  static createInactive(
    overrides: Partial<WorkspaceMember> = {}
  ): WorkspaceMember {
    return this.create({
      ...overrides,
      isActive: false,
    });
  }

  /**
   * 프로필 이미지가 있는 워크스페이스 멤버 생성
   */
  static createWithImage(
    imagePath: string,
    overrides: Partial<WorkspaceMember> = {}
  ): WorkspaceMember {
    return this.create({
      ...overrides,
      imagePath,
    });
  }
}
