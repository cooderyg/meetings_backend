import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { RoleService } from '../role/role.service';
import { Workspace, SubscriptionTier } from './entity/workspace.entity';
import { User } from '../user/entity/user.entity';
import { Role } from '../role/entity/role.entity';
import { SystemRole } from '../role/enum/system-role.enum';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { AppError } from '../../shared/exception/app.error';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { UserFactory } from '../../../test/factories/user.factory';
import { RoleFactory } from '../../../test/factories/role.factory';
import { WorkspaceMemberFactory } from '../../../test/factories/workspace-member.factory';
import { WorkspaceModule } from './workspace.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';

describe('WorkspaceService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: WorkspaceService;
  let workspaceRepository: WorkspaceRepository;
  let workspaceMemberService: WorkspaceMemberService;
  let roleService: RoleService;
  const containerKey = 'workspace-service-integration-test';

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

  const createSystemRole = async (name: SystemRole, description?: string) => {
    const role = RoleFactory.create({
      name,
      description: description || `${name} system role`,
      workspace: null,
    });
    await em.persistAndFlush(role);
    return role;
  };

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    const module = await TestModuleBuilder.create()
      .withModule(WorkspaceModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;
    service = module.get<WorkspaceService>(WorkspaceService);
    workspaceRepository = module.get<WorkspaceRepository>(WorkspaceRepository);
    workspaceMemberService = module.get<WorkspaceMemberService>(
      WorkspaceMemberService
    );
    roleService = module.get<RoleService>(RoleService);

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    // 각 테스트 전에 데이터 초기화
    await em.execute('TRUNCATE TABLE "workspaces" CASCADE');
    await em.execute('TRUNCATE TABLE "workspace_members" CASCADE');
    await em.execute('TRUNCATE TABLE "workspace_member_roles" CASCADE');
    await em.execute('TRUNCATE TABLE "roles" CASCADE');
    await em.execute('TRUNCATE TABLE "users" CASCADE');
    await em.clear();
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

  describe('워크스페이스 생성 시나리오', () => {
    it('새 사용자가 워크스페이스를 생성하고 OWNER가 되는 시나리오', async () => {
      // Given
      const user = await createUser({
        firstName: '길동',
        lastName: '홍',
        email: 'hong@example.com',
      });
      const ownerRole = await createSystemRole(
        SystemRole.OWNER,
        '워크스페이스 소유자'
      );
      const workspaceData = {
        name: 'My Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      };

      // When
      const createdWorkspace = await service.createWorkspace(
        workspaceData,
        user
      );

      // Then
      expect(createdWorkspace).toBeDefined();
      expect(createdWorkspace.name).toBe('My Workspace');
      expect(createdWorkspace.subscriptionTier).toBe(SubscriptionTier.FREE);

      // 워크스페이스가 데이터베이스에 저장되었는지 확인
      const savedWorkspace = await workspaceRepository.findOne({
        id: createdWorkspace.id,
      });
      expect(savedWorkspace).toBeDefined();
      expect(savedWorkspace!.name).toBe('My Workspace');

      // 사용자가 워크스페이스 멤버로 추가되었는지 확인
      const member = await workspaceMemberService.findByUserAndWorkspace(
        user.id,
        createdWorkspace.id
      );
      expect(member).toBeDefined();
      expect(member!.user.id).toBe(user.id);
      expect(member!.workspace.id).toBe(createdWorkspace.id);
      expect(member!.isActive).toBe(true);

      // 사용자가 OWNER 역할을 가지고 있는지 확인
      expect(member!.workspaceMemberRoles).toBeDefined();
      expect(member!.workspaceMemberRoles.length).toBeGreaterThan(0);
      const memberRole = member!.workspaceMemberRoles[0];
      expect(memberRole.role.name).toBe(SystemRole.OWNER);
    });

    it('여러 사용자가 각각 워크스페이스를 생성하는 시나리오', async () => {
      // Given
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });
      const ownerRole = await createSystemRole(SystemRole.OWNER);

      // When
      const workspace1 = await service.createWorkspace(
        { name: 'User1 Workspace', subscriptionTier: SubscriptionTier.FREE },
        user1
      );
      const workspace2 = await service.createWorkspace(
        { name: 'User2 Workspace', subscriptionTier: SubscriptionTier.FREE },
        user2
      );

      // Then
      expect(workspace1.id).not.toBe(workspace2.id);
      expect(workspace1.name).toBe('User1 Workspace');
      expect(workspace2.name).toBe('User2 Workspace');

      // 각 사용자가 자신의 워크스페이스에만 멤버로 있는지 확인
      const member1 = await workspaceMemberService.findByUserAndWorkspace(
        user1.id,
        workspace1.id
      );
      const member2 = await workspaceMemberService.findByUserAndWorkspace(
        user2.id,
        workspace2.id
      );

      expect(member1).toBeDefined();
      expect(member2).toBeDefined();
      expect(member1!.user.id).toBe(user1.id);
      expect(member2!.user.id).toBe(user2.id);

      // 사용자1이 워크스페이스2에 멤버로 없는지 확인
      const member1InWorkspace2 =
        await workspaceMemberService.findByUserAndWorkspace(
          user1.id,
          workspace2.id
        );
      expect(member1InWorkspace2).toBeNull();
    });

    it('시스템 역할이 없으면 워크스페이스 생성이 실패하는 시나리오', async () => {
      // Given
      const user = await createUser();
      const workspaceData = {
        name: 'My Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      };

      // When & Then
      await expect(
        service.createWorkspace(workspaceData, user)
      ).rejects.toThrow(AppError);
      await expect(
        service.createWorkspace(workspaceData, user)
      ).rejects.toMatchObject({
        code: 'role.system.notFound',
      });
    });
  });

  describe('워크스페이스 관리 시나리오', () => {
    it('워크스페이스 이름을 업데이트하는 시나리오', async () => {
      // Given
      const user = await createUser();
      const ownerRole = await createSystemRole(SystemRole.OWNER);
      const workspace = await service.createWorkspace(
        { name: 'Original Name', subscriptionTier: SubscriptionTier.FREE },
        user
      );
      const updateDto: UpdateWorkspaceNameDto = {
        name: 'Updated Workspace Name',
      };

      // When
      const updatedName = await service.updateWorkspaceName(
        workspace.id,
        updateDto
      );

      // Then
      expect(updatedName).toBe('Updated Workspace Name');

      // 데이터베이스에서 변경사항 확인
      const updatedWorkspace = await workspaceRepository.findOne({
        id: workspace.id,
      });
      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace!.name).toBe('Updated Workspace Name');
    });

    it('존재하지 않는 워크스페이스 이름 업데이트 시 실패하는 시나리오', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateWorkspaceNameDto = {
        name: 'Updated Name',
      };

      // When & Then
      await expect(
        service.updateWorkspaceName(nonExistentId, updateDto)
      ).rejects.toThrow(AppError);
      await expect(
        service.updateWorkspaceName(nonExistentId, updateDto)
      ).rejects.toMatchObject({
        code: 'workspace.fetch.notFound',
        context: { workspaceId: nonExistentId },
      });
    });
  });

  describe('워크스페이스 조회 시나리오', () => {
    it('사용자가 속한 모든 워크스페이스를 조회하는 시나리오', async () => {
      // Given
      const user = await createUser();
      const ownerRole = await createSystemRole(SystemRole.OWNER);

      // 사용자가 여러 워크스페이스에 속하도록 설정
      const workspace1 = await service.createWorkspace(
        { name: 'Workspace 1', subscriptionTier: SubscriptionTier.FREE },
        user
      );
      const workspace2 = await service.createWorkspace(
        { name: 'Workspace 2', subscriptionTier: SubscriptionTier.FREE },
        user
      );

      // When
      const userWorkspaces = await service.findByUserId(user.id);

      // Then
      expect(userWorkspaces).toHaveLength(2);
      expect(userWorkspaces.map((w) => w.name)).toContain('Workspace 1');
      expect(userWorkspaces.map((w) => w.name)).toContain('Workspace 2');
    });

    it('워크스페이스에 속하지 않은 사용자는 빈 배열을 반환하는 시나리오', async () => {
      // Given
      const user = await createUser();

      // When
      const userWorkspaces = await service.findByUserId(user.id);

      // Then
      expect(userWorkspaces).toEqual([]);
    });

    it('특정 워크스페이스를 ID로 조회하는 시나리오', async () => {
      // Given
      const user = await createUser();
      const ownerRole = await createSystemRole(SystemRole.OWNER);
      const workspace = await service.createWorkspace(
        { name: 'Test Workspace', subscriptionTier: SubscriptionTier.FREE },
        user
      );

      // When
      const foundWorkspace = await service.findById(workspace.id);

      // Then
      expect(foundWorkspace).toBeDefined();
      expect(foundWorkspace!.id).toBe(workspace.id);
      expect(foundWorkspace!.name).toBe('Test Workspace');
    });

    it('존재하지 않는 워크스페이스 ID로 조회 시 null을 반환하는 시나리오', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When
      const foundWorkspace = await service.findById(nonExistentId);

      // Then
      expect(foundWorkspace).toBeNull();
    });
  });

  describe('워크스페이스 격리 시나리오', () => {
    it('다른 워크스페이스의 데이터가 격리되는 시나리오', async () => {
      // Given
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });
      const ownerRole = await createSystemRole(SystemRole.OWNER);

      const workspace1 = await service.createWorkspace(
        { name: 'Workspace 1', subscriptionTier: SubscriptionTier.FREE },
        user1
      );
      const workspace2 = await service.createWorkspace(
        { name: 'Workspace 2', subscriptionTier: SubscriptionTier.FREE },
        user2
      );

      // When
      const user1Workspaces = await service.findByUserId(user1.id);
      const user2Workspaces = await service.findByUserId(user2.id);

      // Then
      expect(user1Workspaces).toHaveLength(1);
      expect(user2Workspaces).toHaveLength(1);
      expect(user1Workspaces[0].id).toBe(workspace1.id);
      expect(user2Workspaces[0].id).toBe(workspace2.id);

      // 사용자1이 워크스페이스2에 접근할 수 없는지 확인
      const user1InWorkspace2 =
        await workspaceMemberService.findByUserAndWorkspace(
          user1.id,
          workspace2.id
        );
      expect(user1InWorkspace2).toBeNull();
    });
  });

  describe('워크스페이스 구독 등급 시나리오', () => {
    it('다양한 구독 등급의 워크스페이스를 생성하는 시나리오', async () => {
      // Given
      const user = await createUser();
      const ownerRole = await createSystemRole(SystemRole.OWNER);

      // When
      const freeWorkspace = await service.createWorkspace(
        { name: 'Free Workspace', subscriptionTier: SubscriptionTier.FREE },
        user
      );
      const proWorkspace = await service.createWorkspace(
        { name: 'Pro Workspace', subscriptionTier: SubscriptionTier.PREMIUM },
        user
      );
      const enterpriseWorkspace = await service.createWorkspace(
        {
          name: 'Enterprise Workspace',
          subscriptionTier: SubscriptionTier.ENTERPRISE,
        },
        user
      );

      // Then
      expect(freeWorkspace.subscriptionTier).toBe(SubscriptionTier.FREE);
      expect(proWorkspace.subscriptionTier).toBe(SubscriptionTier.PREMIUM);
      expect(enterpriseWorkspace.subscriptionTier).toBe(
        SubscriptionTier.ENTERPRISE
      );

      // 데이터베이스에서 구독 등급이 올바르게 저장되었는지 확인
      const savedFree = await workspaceRepository.findOne({
        id: freeWorkspace.id,
      });
      const savedPro = await workspaceRepository.findOne({
        id: proWorkspace.id,
      });
      const savedEnterprise = await workspaceRepository.findOne({
        id: enterpriseWorkspace.id,
      });

      expect(savedFree!.subscriptionTier).toBe(SubscriptionTier.FREE);
      expect(savedPro!.subscriptionTier).toBe(SubscriptionTier.PREMIUM);
      expect(savedEnterprise!.subscriptionTier).toBe(
        SubscriptionTier.ENTERPRISE
      );
    });
  });
});
