import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { createUserFixture } from '../../../test/fixtures/user.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import { WorkspaceRepository } from './workspace.repository';
import { Workspace, SubscriptionTier } from './entity/workspace.entity';
import { User } from '../user/entity/user.entity';
import { v4 as uuid } from 'uuid';

describe('WorkspaceRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let workspaceRepository: WorkspaceRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'workspace-integration-test';

  // Workspace 생성 헬퍼 함수 (Factory 패턴 사용)

  // User 생성 헬퍼 함수 (Factory 패턴 사용)

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드 (Repository만 테스트)
    module = await TestModuleBuilder.create()
      .withTestcontainer(containerKey)
      .build();

    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // Repository 직접 생성
    workspaceRepository = new WorkspaceRepository(em, 'Workspace');

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

    // Testcontainer 정리
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('findOne', () => {
    it('ID로 워크스페이스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em, {
        name: 'Test Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // When
      const found = await workspaceRepository.findOne({ id: workspace.id });

      // Then
      expect(found).toBeDefined();
      expect(found?.id).toBe(workspace.id);
      expect(found?.name).toBe('Test Workspace');
      expect(found?.subscriptionTier).toBe(SubscriptionTier.FREE);
    });

    it('존재하지 않는 ID로 조회하면 null을 반환해야 함', async () => {
      // Given
      const nonExistentId = uuid();

      // When
      const found = await workspaceRepository.findOne({ id: nonExistentId });

      // Then
      expect(found).toBeNull();
    });

    it('이름으로 워크스페이스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em, {
        name: 'Unique Workspace Name',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // When
      const found = await workspaceRepository.findOne({ name: workspace.name });

      // Then
      expect(found).toBeDefined();
      expect(found?.id).toBe(workspace.id);
      expect(found?.name).toBe('Unique Workspace Name');
    });
  });

  describe('find', () => {
    it('모든 워크스페이스를 조회해야 함', async () => {
      // Given
      await createWorkspaceFixture(em, { name: 'Workspace 1' });
      await createWorkspaceFixture(em, { name: 'Workspace 2' });
      await createWorkspaceFixture(em, { name: 'Workspace 3' });

      // When
      const workspaces = await workspaceRepository.find({});

      // Then
      expect(workspaces).toHaveLength(3);
      expect(workspaces.map((w) => w.name)).toEqual([
        'Workspace 1',
        'Workspace 2',
        'Workspace 3',
      ]);
    });

    it('구독 티어별로 워크스페이스를 필터링해야 함', async () => {
      // Given
      await createWorkspaceFixture(em, {
        name: 'Free Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });
      await createWorkspaceFixture(em, {
        name: 'Premium Workspace',
        subscriptionTier: SubscriptionTier.PREMIUM,
      });
      await createWorkspaceFixture(em, {
        name: 'Another Free Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // When
      const freeWorkspaces = await workspaceRepository.find({
        subscriptionTier: SubscriptionTier.FREE,
      });

      // Then
      expect(freeWorkspaces).toHaveLength(2);
      expect(
        freeWorkspaces.every(
          (w) => w.subscriptionTier === SubscriptionTier.FREE
        )
      ).toBe(true);
    });

    it('빈 조건으로 조회하면 모든 워크스페이스를 반환해야 함', async () => {
      // Given
      await createWorkspaceFixture(em, { name: 'Workspace 1' });
      await createWorkspaceFixture(em, { name: 'Workspace 2' });

      // When
      const workspaces = await workspaceRepository.find({});

      // Then
      expect(workspaces).toHaveLength(2);
    });
  });

  describe('assign', () => {
    it('새 워크스페이스 엔티티를 생성해야 함', async () => {
      // Given
      const workspaceData = {
        name: 'New Workspace',
        subscriptionTier: SubscriptionTier.FREE,
        imagePath: null,
        settings: {},
      };

      // When
      const workspace = workspaceRepository.assign(
        new Workspace(),
        workspaceData
      );

      // Then
      expect(workspace).toBeDefined();
      expect(workspace.name).toBe('New Workspace');
      expect(workspace.subscriptionTier).toBe(SubscriptionTier.FREE);
      expect(workspace.imagePath).toBeNull();
      expect(workspace.settings).toEqual({});
    });

    it('기존 워크스페이스에 데이터를 할당해야 함', async () => {
      // Given
      const existingWorkspace = await createWorkspaceFixture(em, {
        name: 'Original Name',
        subscriptionTier: SubscriptionTier.FREE,
      });

      const updateData = {
        name: 'Updated Name',
        subscriptionTier: SubscriptionTier.PREMIUM,
      };

      // When
      const updatedWorkspace = workspaceRepository.assign(
        existingWorkspace,
        updateData
      );

      // Then
      expect(updatedWorkspace).toBe(existingWorkspace);
      expect(updatedWorkspace.name).toBe('Updated Name');
      expect(updatedWorkspace.subscriptionTier).toBe(SubscriptionTier.PREMIUM);
    });
  });

  describe('persistAndFlush', () => {
    it('워크스페이스를 데이터베이스에 저장해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em, {
        name: 'Persisted Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // Then
      const found = await workspaceRepository.findOne({ id: workspace.id });
      expect(found).toBeDefined();
      expect(found?.name).toBe('Persisted Workspace');
    });

    it('여러 워크스페이스를 한 번에 저장해야 함', async () => {
      // Given
      const workspace1 = await createWorkspaceFixture(em, {
        subscriptionTier: SubscriptionTier.FREE,
      });
      const workspace2 = await createWorkspaceFixture(em, {
        subscriptionTier: SubscriptionTier.FREE,
      });
      const workspace3 = await createWorkspaceFixture(em, {
        subscriptionTier: SubscriptionTier.FREE,
      });

      // Then
      const found = await workspaceRepository.find({});
      expect(found).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('워크스페이스 정보를 업데이트해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em, {
        name: 'Original Name',
        subscriptionTier: SubscriptionTier.FREE,
      });

      workspace.name = 'Updated Name';
      workspace.subscriptionTier = SubscriptionTier.PREMIUM;

      // When
      await workspaceRepository.update(workspace);

      // Then
      const updated = await workspaceRepository.findOne({ id: workspace.id });
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.subscriptionTier).toBe(SubscriptionTier.PREMIUM);
    });
  });

  describe('remove', () => {
    it('워크스페이스를 삭제해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em, {
        name: 'To Be Deleted',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // When
      await em.removeAndFlush(workspace);

      // Then
      const found = await workspaceRepository.findOne({ id: workspace.id });
      expect(found).toBeNull();
    });
  });

  describe('복합 쿼리', () => {
    it('이름과 구독 티어로 워크스페이스를 찾아야 함', async () => {
      // Given
      await createWorkspaceFixture(em, {
        name: 'Free Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });
      await createWorkspaceFixture(em, {
        name: 'Premium Workspace',
        subscriptionTier: SubscriptionTier.PREMIUM,
      });
      await createWorkspaceFixture(em, {
        name: 'Another Free Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // When
      const found = await workspaceRepository.findOne({
        name: 'Free Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // Then
      expect(found).toBeDefined();
      expect(found?.name).toBe('Free Workspace');
      expect(found?.subscriptionTier).toBe(SubscriptionTier.FREE);
    });

    it('이름에 특정 문자열이 포함된 워크스페이스를 찾아야 함', async () => {
      // Given
      await createWorkspaceFixture(em, { name: 'Development Workspace' });
      await createWorkspaceFixture(em, { name: 'Production Workspace' });
      await createWorkspaceFixture(em, { name: 'Test Environment' });

      // When
      const workspaces = await workspaceRepository.find({
        name: { $like: '%Workspace%' },
      });

      // Then
      expect(workspaces).toHaveLength(2);
      expect(workspaces.map((w) => w.name)).toEqual([
        'Development Workspace',
        'Production Workspace',
      ]);
    });
  });
});
