import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorkspaceMemberService } from './workspace-member.service';
import { WorkspaceMemberRepository } from './workspace-member.repository';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { Role } from '../role/entity/role.entity';
import { SystemRole } from '../role/enum/system-role.enum';
import { IWorkspaceMemberCreateData } from './interfaces/workspace-member-create-data.interface';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { WorkspaceMemberFactory } from '../../../test/factories/workspace-member.factory';
import { UserFactory } from '../../../test/factories/user.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { RoleFactory } from '../../../test/factories/role.factory';
import { WorkspaceMemberModule } from './workspace-member.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';

describe('WorkspaceMemberService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: WorkspaceMemberService;
  let repository: WorkspaceMemberRepository;
  const containerKey = 'workspace-member-service-integration-test';

  // Helper functions
  const createUser = async (overrides: Partial<User> = {}) => {
    const user = UserFactory.create(overrides);
    await em.persistAndFlush(user);
    return user;
  };

  const createWorkspace = async (overrides: Partial<Workspace> = {}) => {
    const workspace = WorkspaceFactory.create(overrides);
    await em.persistAndFlush(workspace);
    return workspace;
  };

  const createRole = async (overrides: Partial<Role> = {}) => {
    const role = RoleFactory.create(overrides);
    await em.persistAndFlush(role);
    return role;
  };

  const createWorkspaceMember = async (
    overrides: Partial<WorkspaceMember> = {}
  ) => {
    const member = WorkspaceMemberFactory.create(overrides);
    await em.persistAndFlush(member);
    return member;
  };

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    const module = await TestModuleBuilder.create()
      .withModule(WorkspaceMemberModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    service = module.get<WorkspaceMemberService>(WorkspaceMemberService);
    repository = module.get<WorkspaceMemberRepository>(
      WorkspaceMemberRepository
    );

    em = orm.em as EntityManager;

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    // 각 테스트를 트랜잭션으로 격리
    await orm.em.begin();
  });

  afterEach(async () => {
    // 트랜잭션 롤백으로 데이터 초기화
    await orm.em.rollback();
    orm.em.clear();
  });

  afterAll(async () => {
    // 정리 작업
    if (em) {
      await em.getConnection().close(true);
    }
    if (orm) {
      await orm.close();
    }
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('워크스페이스 멤버 생성 시나리오', () => {
    it('새 사용자를 워크스페이스에 멤버로 추가하는 시나리오', async () => {
      // Given
      const user = await createUser({
        firstName: '길동',
        lastName: '홍',
        email: 'hong@example.com',
      });
      const workspace = await createWorkspace({
        name: 'Test Workspace',
      });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const createData: IWorkspaceMemberCreateData = {
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      };

      // When
      const createdMember = await service.createWorkspaceMember(createData);

      // Then
      expect(createdMember).toBeDefined();
      expect(createdMember.user.id).toBe(user.id);
      expect(createdMember.workspace.id).toBe(workspace.id);
      expect(createdMember.firstName).toBe(user.firstName);
      expect(createdMember.lastName).toBe(user.lastName);
      expect(createdMember.isActive).toBe(true);

      // 데이터베이스에서 멤버가 저장되었는지 확인
      const savedMember = await repository.findById(createdMember.id);
      expect(savedMember).toBeDefined();
      expect(savedMember!.user.id).toBe(user.id);
      expect(savedMember!.workspace.id).toBe(workspace.id);
    });

    it('여러 사용자를 같은 워크스페이스에 멤버로 추가하는 시나리오', async () => {
      // Given
      const workspace = await createWorkspace({
        name: 'Test Workspace',
      });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });
      const user3 = await createUser({ email: 'user3@example.com' });

      // When
      const member1 = await service.createWorkspaceMember({
        user: user1,
        workspace,
        role,
        firstName: user1.firstName,
        lastName: user1.lastName,
        isActive: true,
      });
      const member2 = await service.createWorkspaceMember({
        user: user2,
        workspace,
        role,
        firstName: user2.firstName,
        lastName: user2.lastName,
        isActive: true,
      });
      const member3 = await service.createWorkspaceMember({
        user: user3,
        workspace,
        role,
        firstName: user3.firstName,
        lastName: user3.lastName,
        isActive: true,
      });

      // Then
      expect(member1.id).not.toBe(member2.id);
      expect(member2.id).not.toBe(member3.id);
      expect(member1.workspace.id).toBe(workspace.id);
      expect(member2.workspace.id).toBe(workspace.id);
      expect(member3.workspace.id).toBe(workspace.id);

      // 워크스페이스의 모든 멤버 조회
      const workspaceMembers = await service.findByWorkspace(workspace.id);
      expect(workspaceMembers).toHaveLength(3);
      expect(workspaceMembers.map((m) => m.user.id)).toContain(user1.id);
      expect(workspaceMembers.map((m) => m.user.id)).toContain(user2.id);
      expect(workspaceMembers.map((m) => m.user.id)).toContain(user3.id);
    });

    it('같은 사용자를 다른 워크스페이스에 멤버로 추가하는 시나리오', async () => {
      // Given
      const user = await createUser({ email: 'user@example.com' });
      const workspace1 = await createWorkspace({ name: 'Workspace 1' });
      const workspace2 = await createWorkspace({ name: 'Workspace 2' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      // When
      const member1 = await service.createWorkspaceMember({
        user,
        workspace: workspace1,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });
      const member2 = await service.createWorkspaceMember({
        user,
        workspace: workspace2,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      // Then
      expect(member1.id).not.toBe(member2.id);
      expect(member1.user.id).toBe(user.id);
      expect(member2.user.id).toBe(user.id);
      expect(member1.workspace.id).toBe(workspace1.id);
      expect(member2.workspace.id).toBe(workspace2.id);

      // 사용자가 두 워크스페이스 모두에 멤버로 있는지 확인
      const userInWorkspace1 = await service.findByUserAndWorkspace(
        user.id,
        workspace1.id
      );
      const userInWorkspace2 = await service.findByUserAndWorkspace(
        user.id,
        workspace2.id
      );
      expect(userInWorkspace1).toBeDefined();
      expect(userInWorkspace2).toBeDefined();
    });
  });

  describe('워크스페이스 멤버 조회 시나리오', () => {
    it('워크스페이스의 모든 멤버를 조회하는 시나리오', async () => {
      // Given
      const workspace = await createWorkspace({ name: 'Test Workspace' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const users = await Promise.all([
        createUser({ email: 'user1@example.com' }),
        createUser({ email: 'user2@example.com' }),
        createUser({ email: 'user3@example.com' }),
      ]);

      const members = await Promise.all(
        users.map((user) =>
          service.createWorkspaceMember({
            user,
            workspace,
            role,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: true,
          })
        )
      );

      // When
      const workspaceMembers = await service.findByWorkspace(workspace.id);

      // Then
      expect(workspaceMembers).toHaveLength(3);
      expect(workspaceMembers.map((m) => m.user.id)).toEqual(
        expect.arrayContaining(users.map((u) => u.id))
      );
    });

    it('빈 워크스페이스의 멤버 조회 시 빈 배열을 반환하는 시나리오', async () => {
      // Given
      const workspace = await createWorkspace({ name: 'Empty Workspace' });

      // When
      const workspaceMembers = await service.findByWorkspace(workspace.id);

      // Then
      expect(workspaceMembers).toEqual([]);
    });

    it('사용자와 워크스페이스로 멤버를 조회하는 시나리오', async () => {
      // Given
      const user = await createUser({ email: 'user@example.com' });
      const workspace = await createWorkspace({ name: 'Test Workspace' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const member = await service.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      // When
      const foundMember = await service.findByUserAndWorkspace(
        user.id,
        workspace.id
      );

      // Then
      expect(foundMember).toBeDefined();
      expect(foundMember!.id).toBe(member.id);
      expect(foundMember!.user.id).toBe(user.id);
      expect(foundMember!.workspace.id).toBe(workspace.id);
    });

    it('존재하지 않는 사용자-워크스페이스 조합 조회 시 null을 반환하는 시나리오', async () => {
      // Given
      const user = await createUser({ email: 'user@example.com' });
      const workspace = await createWorkspace({ name: 'Test Workspace' });

      // When
      const foundMember = await service.findByUserAndWorkspace(
        user.id,
        workspace.id
      );

      // Then
      expect(foundMember).toBeNull();
    });
  });

  describe('워크스페이스 멤버 활성화 상태 시나리오', () => {
    it('활성화된 멤버만 조회하는 시나리오', async () => {
      // Given
      const workspace = await createWorkspace({ name: 'Test Workspace' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const activeUser = await createUser({ email: 'active@example.com' });
      const inactiveUser = await createUser({ email: 'inactive@example.com' });

      const activeMember = await service.createWorkspaceMember({
        user: activeUser,
        workspace,
        role,
        firstName: activeUser.firstName,
        lastName: activeUser.lastName,
        isActive: true,
      });

      const inactiveMember = await service.createWorkspaceMember({
        user: inactiveUser,
        workspace,
        role,
        firstName: inactiveUser.firstName,
        lastName: inactiveUser.lastName,
        isActive: false,
      });

      // When
      const isActiveUserActive = await service.isActiveMember(
        activeUser.id,
        workspace.id
      );
      const isInactiveUserActive = await service.isActiveMember(
        inactiveUser.id,
        workspace.id
      );

      // Then
      expect(isActiveUserActive).toBe(true);
      expect(isInactiveUserActive).toBe(false);
    });

    it('활성화된 멤버를 인증용으로 조회하는 시나리오', async () => {
      // Given
      const user = await createUser({ email: 'user@example.com' });
      const workspace = await createWorkspace({ name: 'Test Workspace' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const member = await service.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      // When
      const authMember = await service.findByUserAndWorkspaceForAuth(
        user.id,
        workspace.id
      );

      // Then
      expect(authMember).toBeDefined();
      expect(authMember!.id).toBe(member.id);
      expect(authMember!.user.id).toBe(user.id);
      expect(authMember!.workspace.id).toBe(workspace.id);
      expect(authMember!.isActive).toBe(true);
    });

    it('비활성화된 멤버는 인증용 조회에서 null을 반환하는 시나리오', async () => {
      // Given
      const user = await createUser({ email: 'user@example.com' });
      const workspace = await createWorkspace({ name: 'Test Workspace' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      await service.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: false, // 비활성화
      });

      // When
      const authMember = await service.findByUserAndWorkspaceForAuth(
        user.id,
        workspace.id
      );

      // Then
      expect(authMember).toBeNull();
    });
  });

  describe('워크스페이스 멤버 권한 시나리오', () => {
    it('다양한 역할을 가진 멤버들을 생성하는 시나리오', async () => {
      // Given
      const workspace = await createWorkspace({ name: 'Test Workspace' });

      const ownerRole = await createRole({
        name: SystemRole.OWNER,
        workspace: null,
      });
      const adminRole = await createRole({
        name: SystemRole.ADMIN,
        workspace: null,
      });
      const memberRole = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const owner = await createUser({ email: 'owner@example.com' });
      const admin = await createUser({ email: 'admin@example.com' });
      const member = await createUser({ email: 'member@example.com' });

      // When
      const ownerMember = await service.createWorkspaceMember({
        user: owner,
        workspace,
        role: ownerRole,
        firstName: owner.firstName,
        lastName: owner.lastName,
        isActive: true,
      });

      const adminMember = await service.createWorkspaceMember({
        user: admin,
        workspace,
        role: adminRole,
        firstName: admin.firstName,
        lastName: admin.lastName,
        isActive: true,
      });

      const memberMember = await service.createWorkspaceMember({
        user: member,
        workspace,
        role: memberRole,
        firstName: member.firstName,
        lastName: member.lastName,
        isActive: true,
      });

      // Then
      expect(ownerMember.workspaceMemberRoles).toBeDefined();
      expect(adminMember.workspaceMemberRoles).toBeDefined();
      expect(memberMember.workspaceMemberRoles).toBeDefined();

      // 각 멤버의 역할 확인
      const ownerRoleName = ownerMember.workspaceMemberRoles[0]?.role.name;
      const adminRoleName = adminMember.workspaceMemberRoles[0]?.role.name;
      const memberRoleName = memberMember.workspaceMemberRoles[0]?.role.name;

      expect(ownerRoleName).toBe(SystemRole.OWNER);
      expect(adminRoleName).toBe(SystemRole.ADMIN);
      expect(memberRoleName).toBe(SystemRole.CAN_VIEW);
    });
  });

  describe('워크스페이스 멤버 격리 시나리오', () => {
    it('다른 워크스페이스의 멤버 데이터가 격리되는 시나리오', async () => {
      // Given
      const workspace1 = await createWorkspace({ name: 'Workspace 1' });
      const workspace2 = await createWorkspace({ name: 'Workspace 2' });
      const role = await createRole({
        name: SystemRole.CAN_VIEW,
        workspace: null,
      });

      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });

      // When
      const member1 = await service.createWorkspaceMember({
        user: user1,
        workspace: workspace1,
        role,
        firstName: user1.firstName,
        lastName: user1.lastName,
        isActive: true,
      });

      const member2 = await service.createWorkspaceMember({
        user: user2,
        workspace: workspace2,
        role,
        firstName: user2.firstName,
        lastName: user2.lastName,
        isActive: true,
      });

      // Then
      // 워크스페이스1의 멤버 조회
      const workspace1Members = await service.findByWorkspace(workspace1.id);
      expect(workspace1Members).toHaveLength(1);
      expect(workspace1Members[0].user.id).toBe(user1.id);

      // 워크스페이스2의 멤버 조회
      const workspace2Members = await service.findByWorkspace(workspace2.id);
      expect(workspace2Members).toHaveLength(1);
      expect(workspace2Members[0].user.id).toBe(user2.id);

      // 사용자1이 워크스페이스2에 멤버로 없는지 확인
      const user1InWorkspace2 = await service.findByUserAndWorkspace(
        user1.id,
        workspace2.id
      );
      expect(user1InWorkspace2).toBeNull();

      // 사용자2가 워크스페이스1에 멤버로 없는지 확인
      const user2InWorkspace1 = await service.findByUserAndWorkspace(
        user2.id,
        workspace1.id
      );
      expect(user2InWorkspace1).toBeNull();
    });
  });
});
