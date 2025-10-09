import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { createUserFixture } from '../../../test/fixtures/user.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import {
  createRoleFixture,
  createWorkspaceMemberFixture,
} from '../../../test/fixtures/meeting.fixture';
import { SystemRole } from '../role/enum/system-role.enum';
import { WorkspaceMemberRepository } from './workspace-member.repository';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { Role } from '../role/entity/role.entity';
import { WorkspaceMemberModule } from './workspace-member.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { v4 as uuid } from 'uuid';

describe('WorkspaceMemberRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let workspaceMemberRepository: WorkspaceMemberRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'workspace-member-integration-test';

  // Helper to create a user for testing

  // Helper to create a workspace for testing

  // Helper to create a role for testing

  // Helper to create a workspace member for testing

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드 (Repository만 테스트)
    module = await TestModuleBuilder.create()
      .withModule(WorkspaceMemberModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // Repository는 모듈에서 가져오기
    workspaceMemberRepository = module.get<WorkspaceMemberRepository>(
      WorkspaceMemberRepository
    );

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    // 각 테스트 전에 데이터 초기화
    // NOTE: SystemRole 등 공유 데이터가 있어 TRUNCATE 필요
    await em.execute('TRUNCATE TABLE "workspace_members" CASCADE');
    await em.execute('TRUNCATE TABLE "workspaces" CASCADE');
    await em.execute('TRUNCATE TABLE "users" CASCADE');
    await em.clear();
  });

  afterAll(async () => {
    if (em) {
      await em.getConnection().close(true);
    }
    if (orm) {
      await orm.close();
    }
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('create', () => {
    it('새 워크스페이스 멤버를 생성해야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const workspaceMemberData = {
        user,
        workspace,
        role,
        firstName: '길동',
        lastName: '홍',
        isActive: true,
      };

      // When
      const result =
        await workspaceMemberRepository.create(workspaceMemberData);

      // Then
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.workspace.id).toBe(workspace.id);
      expect(result.firstName).toBe('길동');
      expect(result.lastName).toBe('홍');
      expect(result.isActive).toBe(true);
    });
  });

  describe('findById', () => {
    it('ID로 워크스페이스 멤버를 찾아야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        user,
        workspace,
        firstName: '길동',
        lastName: '홍',
      });

      // When
      const result = await workspaceMemberRepository.findById(
        workspaceMember.id
      );

      // Then
      expect(result).toBeDefined();
      expect(result!.id).toBe(workspaceMember.id);
      expect(result!.firstName).toBe('길동');
      expect(result!.lastName).toBe('홍');
    });

    it('존재하지 않는 ID로 찾으면 null을 반환해야 함', async () => {
      // Given
      const nonExistentId = uuid();

      // When
      const result = await workspaceMemberRepository.findById(nonExistentId);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 멤버를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const user1 = await createUserFixture(em, { email: 'user1@example.com' });
      const user2 = await createUserFixture(em, { email: 'user2@example.com' });

      await createWorkspaceMemberFixture(em, {
        user: user1,
        workspace,
        firstName: '사용자1',
        lastName: '테스트',
      });
      await createWorkspaceMemberFixture(em, {
        user: user2,
        workspace,
        firstName: '사용자2',
        lastName: '테스트',
      });

      // When
      const result = await workspaceMemberRepository.findByWorkspace(
        workspace.id
      );

      // Then
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.firstName)).toContain('사용자1');
      expect(result.map((m) => m.firstName)).toContain('사용자2');
    });

    it('워크스페이스에 멤버가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);

      // When
      const result = await workspaceMemberRepository.findByWorkspace(
        workspace.id
      );

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('findByUserAndWorkspace', () => {
    it('사용자와 워크스페이스로 멤버를 찾아야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);
      await createWorkspaceMemberFixture(em, {
        user,
        workspace,
        firstName: '길동',
        lastName: '홍',
      });

      // When
      const result = await workspaceMemberRepository.findByUserAndWorkspace(
        user.id,
        workspace.id
      );

      // Then
      expect(result).toBeDefined();
      expect(result!.user.id).toBe(user.id);
      expect(result!.workspace.id).toBe(workspace.id);
    });

    it('존재하지 않는 조합으로 찾으면 null을 반환해야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);

      // When
      const result = await workspaceMemberRepository.findByUserAndWorkspace(
        user.id,
        workspace.id
      );

      // Then
      expect(result).toBeNull();
    });
  });

  describe('findActiveByUserAndWorkspace', () => {
    it('활성화된 멤버를 찾아야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);
      await createWorkspaceMemberFixture(em, {
        user,
        workspace,
        isActive: true,
        firstName: '활성',
        lastName: '멤버',
      });

      // When
      const result =
        await workspaceMemberRepository.findActiveByUserAndWorkspace(
          user.id,
          workspace.id
        );

      // Then
      expect(result).toBeDefined();
      expect(result!.isActive).toBe(true);
    });

    it('비활성화된 멤버는 찾지 않아야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);
      await createWorkspaceMemberFixture(em, {
        user,
        workspace,
        isActive: false,
        firstName: '비활성',
        lastName: '멤버',
      });

      // When
      const result =
        await workspaceMemberRepository.findActiveByUserAndWorkspace(
          user.id,
          workspace.id
        );

      // Then
      expect(result).toBeNull();
    });
  });

  describe('findByUserAndWorkspaceForAuth', () => {
    it('인증용 멤버 정보를 찾아야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);
      await createWorkspaceMemberFixture(em, {
        user,
        workspace,
        isActive: true,
        firstName: '인증',
        lastName: '멤버',
      });

      // When
      const result =
        await workspaceMemberRepository.findByUserAndWorkspaceForAuth(
          user.id,
          workspace.id
        );

      // Then
      expect(result).toBeDefined();
      expect(result!.user.id).toBe(user.id);
      expect(result!.workspace.id).toBe(workspace.id);
    });

    it('인증용 멤버 정보를 찾을 수 없으면 null을 반환해야 함', async () => {
      // Given
      const user = await createUserFixture(em);
      const workspace = await createWorkspaceFixture(em);

      // When
      const result =
        await workspaceMemberRepository.findByUserAndWorkspaceForAuth(
          user.id,
          workspace.id
        );

      // Then
      expect(result).toBeNull();
    });
  });
});
