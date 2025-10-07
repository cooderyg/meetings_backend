import { EntityManager } from '@mikro-orm/postgresql';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { User } from '../../src/domain/user/entity/user.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { Role } from '../../src/domain/role/entity/role.entity';
import { WorkspaceMemberRole } from '../../src/domain/workspace-member-role/entity/workspace-member-role.entity';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';
import { WorkspaceFactory } from '../factories/workspace.factory';
import { UserFactory } from '../factories/user.factory';
import { createWorkspaceMemberFixture } from '../fixtures/meeting.fixture';

/**
 * Workspace 관련 고수준 테스트 시나리오
 *
 * Object Mother 패턴을 사용하여 복잡한 비즈니스 시나리오를 캡슐화합니다.
 * Factory는 개별 엔티티 생성에 집중하고, Scenario는 엔티티 간 관계와 전체 컨텍스트를 구성합니다.
 *
 * @example
 * ```typescript
 * const scenarios = new WorkspaceScenarios(em);
 *
 * // 관리자가 있는 워크스페이스
 * const { workspace, admin, adminMember } = await scenarios.createWorkspaceWithAdmin();
 *
 * // 여러 멤버가 있는 워크스페이스
 * const { workspace, admin, members } = await scenarios.createWorkspaceWithMembers(5);
 *
 * // 완전히 설정된 팀 워크스페이스
 * const team = await scenarios.createFullTeamWorkspace();
 * ```
 */
export class WorkspaceScenarios {
  constructor(private em: EntityManager) {}

  /**
   * 기본 워크스페이스만 생성
   */
  async createEmptyWorkspace(): Promise<{ workspace: Workspace }> {
    const workspace = await new WorkspaceFactory(this.em).create();
    return { workspace };
  }

  /**
   * 관리자 1명이 있는 워크스페이스 생성
   * - 가장 기본적인 워크스페이스 시나리오
   * - Admin 권한을 가진 멤버 1명 포함
   */
  async createWorkspaceWithAdmin(): Promise<{
    workspace: Workspace;
    admin: User;
    adminMember: WorkspaceMember;
  }> {
    const workspace = await new WorkspaceFactory(this.em).create();
    const admin = await new UserFactory(this.em).create();
    const adminMember = await createWorkspaceMemberFixture(this.em, {
      workspace,
      user: admin,
    });

    return { workspace, admin, adminMember };
  }

  /**
   * 관리자 + 일반 멤버 N명이 있는 워크스페이스 생성
   * - 팀 협업 시나리오
   * - 관리자 1명 + 지정된 수의 일반 멤버
   */
  async createWorkspaceWithMembers(memberCount: number = 3): Promise<{
    workspace: Workspace;
    admin: User;
    adminMember: WorkspaceMember;
    members: User[];
    workspaceMembers: WorkspaceMember[];
  }> {
    const { workspace, admin, adminMember } = await this.createWorkspaceWithAdmin();

    const members = await new UserFactory(this.em).createList(memberCount);
    const workspaceMembers = await Promise.all(
      members.map((user) =>
        createWorkspaceMemberFixture(this.em, {
          workspace,
          user,
        })
      )
    );

    return {
      workspace,
      admin,
      adminMember,
      members,
      workspaceMembers,
    };
  }

  /**
   * Premium 티어 워크스페이스 (관리자 + 멤버)
   * - 유료 플랜 테스트용
   */
  async createPremiumWorkspace(memberCount: number = 3): Promise<{
    workspace: Workspace;
    admin: User;
    adminMember: WorkspaceMember;
    members: User[];
    workspaceMembers: WorkspaceMember[];
  }> {
    const workspace = await new WorkspaceFactory(this.em).asPremium().create();
    const admin = await new UserFactory(this.em).create();
    const adminMember = await createWorkspaceMemberFixture(this.em, {
      workspace,
      user: admin,
    });

    const members = await new UserFactory(this.em).createList(memberCount);
    const workspaceMembers = await Promise.all(
      members.map((user) =>
        createWorkspaceMemberFixture(this.em, {
          workspace,
          user,
        })
      )
    );

    return {
      workspace,
      admin,
      adminMember,
      members,
      workspaceMembers,
    };
  }

  /**
   * 완전히 설정된 팀 워크스페이스
   * - 실제 프로덕션 환경과 유사한 완전한 워크스페이스
   * - 관리자, 일반 멤버, 게스트 등 다양한 역할
   */
  async createFullTeamWorkspace(): Promise<{
    workspace: Workspace;
    admin: User;
    adminMember: WorkspaceMember;
    regularMembers: User[];
    regularWorkspaceMembers: WorkspaceMember[];
    viewers: User[];
    viewerWorkspaceMembers: WorkspaceMember[];
  }> {
    const workspace = await new WorkspaceFactory(this.em)
      .withName('Full Team Workspace')
      .asPremium()
      .create();

    const admin = await new UserFactory(this.em)
      .withName('Admin', 'User')
      .create();

    const adminMember = await createWorkspaceMemberFixture(this.em, {
      workspace,
      user: admin,
    });

    // 일반 멤버 3명
    const regularMembers = await new UserFactory(this.em).createList(3);
    const regularWorkspaceMembers = await Promise.all(
      regularMembers.map((user) =>
        createWorkspaceMemberFixture(this.em, {
          workspace,
          user,
        })
      )
    );

    // 뷰어 2명
    const viewers = await new UserFactory(this.em).createList(2);
    const viewerWorkspaceMembers = await Promise.all(
      viewers.map((user) =>
        createWorkspaceMemberFixture(this.em, {
          workspace,
          user,
        })
      )
    );

    return {
      workspace,
      admin,
      adminMember,
      regularMembers,
      regularWorkspaceMembers,
      viewers,
      viewerWorkspaceMembers,
    };
  }

  /**
   * 여러 워크스페이스를 가진 사용자 시나리오
   * - 멀티 워크스페이스 테스트용
   * - 한 사용자가 여러 워크스페이스에 속한 경우
   */
  async createUserWithMultipleWorkspaces(workspaceCount: number = 3): Promise<{
    user: User;
    workspaces: Workspace[];
    workspaceMembers: WorkspaceMember[];
  }> {
    const user = await new UserFactory(this.em).create();
    const workspaces = await new WorkspaceFactory(this.em).createList(workspaceCount);

    const workspaceMembers = await Promise.all(
      workspaces.map((workspace) =>
        createWorkspaceMemberFixture(this.em, {
          workspace,
          user,
        })
      )
    );

    return { user, workspaces, workspaceMembers };
  }
}
