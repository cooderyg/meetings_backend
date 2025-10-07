import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { SpaceService } from './space.service';
import { SpaceRepository } from './space.repository';
import { ResourceService } from '../resource/resource.service';
import { Space } from './entity/space.entity';
import { ResourceType, ResourceVisibility } from '../resource/entity/resource.entity';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { createWorkspaceMemberFixture } from '../../../test/fixtures/meeting.fixture';
import { AppError } from '../../shared/exception/app.error';
import { SpaceModule } from './space.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { SpaceFactory } from '../../../test/factories/space.factory';

describe('SpaceService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: SpaceService;
  let repository: SpaceRepository;
  let resourceService: ResourceService;
  const containerKey = 'space-service-integration-test';

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    const module = await TestModuleBuilder.create()
      .withModule(SpaceModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<SpaceService>(SpaceService);
    repository = module.get<SpaceRepository>(SpaceRepository);
    resourceService = module.get<ResourceService>(ResourceService);

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성 (기존 스키마 삭제 후 재생성)
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000); // Testcontainer 시작 시간 고려

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

  describe('create', () => {
    it('Resource와 함께 Space를 원자적으로 생성해야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Test Space',
        parentPath: 'root',
      });

      // Then
      expect(space).toBeDefined();
      expect(space.id).toBeDefined();
      expect(space.resource).toBeDefined();
      expect(space.resource.title).toBe('Test Space');
      expect(space.resource.type).toBe(ResourceType.SPACE);
      expect(space.resource.visibility).toBe(ResourceVisibility.PUBLIC);
      expect(space.resource.owner.id).toBe(member.id);
      expect(space.workspace.id).toBe(workspace.id);
    });

    it('description을 포함하여 Space를 생성해야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Test Space with Description',
        parentPath: 'root',
        description: 'This is a test space',
      });

      // Then
      expect(space.description).toBe('This is a test space');
    });

    it('@Transactional 데코레이터로 인해 자동으로 flush되어야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Transactional Test',
        parentPath: 'root',
      });

      // Clear identity map to force DB query
      em.clear();

      // Then - DB에서 직접 조회 가능해야 함
      const found = await repository.findById(space.id);
      expect(found).toBeDefined();
      expect(found?.resource.title).toBe('Transactional Test');
    });
  });

  describe('findById', () => {
    it('ID로 Space를 찾아야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const created = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Find Test',
        parentPath: 'root',
      });

      em.clear();

      // When
      const found = await service.findById(created.id);

      // Then
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.resource.title).toBe('Find Test');
    });

    it('존재하지 않는 Space에 대해 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(service.findById(nonExistentId)).rejects.toThrow(AppError);
      await expect(service.findById(nonExistentId)).rejects.toMatchObject({
        code: 'space.fetch.notFound',
      });
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 Space를 반환해야 함', async () => {
      // Given
      const workspace1 = await new WorkspaceFactory(em).create();
      const workspace2 = await new WorkspaceFactory(em).create();
      const member1 = await createWorkspaceMemberFixture(em, { workspace: workspace1 });
      const member2 = await createWorkspaceMemberFixture(em, { workspace: workspace2 });

      await service.create({
        workspaceId: workspace1.id,
        workspaceMemberId: member1.id,
        title: 'Space 1',
        parentPath: 'root',
      });
      await service.create({
        workspaceId: workspace1.id,
        workspaceMemberId: member1.id,
        title: 'Space 2',
        parentPath: 'root',
      });
      await service.create({
        workspaceId: workspace2.id,
        workspaceMemberId: member2.id,
        title: 'Space 3',
        parentPath: 'root',
      });

      em.clear();

      // When
      const spaces = await service.findByWorkspace(workspace1.id);

      // Then
      expect(spaces).toHaveLength(2);
      expect(spaces.every((s) => s.workspace.id === workspace1.id)).toBe(true);
    });
  });

  describe('findByWorkspaceAndUserId', () => {
    it('특정 사용자의 워크스페이스 Space를 반환해야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member1 = await createWorkspaceMemberFixture(em, { workspace });
      const member2 = await createWorkspaceMemberFixture(em, { workspace });

      await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member1.id,
        title: 'User 1 Space',
        parentPath: 'root',
      });
      await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member2.id,
        title: 'User 2 Space',
        parentPath: 'root',
      });

      em.clear();

      // When
      const spaces = await service.findByWorkspaceAndUserId(
        workspace.id,
        member1.user.id
      );

      // Then
      expect(spaces).toHaveLength(1);
      expect(spaces[0].resource.owner.user.id).toBe(member1.user.id);
    });
  });

  describe('update', () => {
    it('Space의 title을 업데이트해야 함 (Resource title 동기화)', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Original Title',
        parentPath: 'root',
      });

      em.clear();

      // When
      const updated = await service.update(space.id, {
        title: 'Updated Title',
      });

      // Then
      expect(updated.resource.title).toBe('Updated Title');
    });

    it('Space의 description을 업데이트해야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Test Space',
        parentPath: 'root',
        description: 'Original description',
      });

      em.clear();

      // When
      const updated = await service.update(space.id, {
        description: 'Updated description',
      });

      // Then
      expect(updated.description).toBe('Updated description');
    });

    it('title과 description을 함께 업데이트해야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Original Title',
        parentPath: 'root',
        description: 'Original description',
      });

      em.clear();

      // When
      const updated = await service.update(space.id, {
        title: 'Updated Title',
        description: 'Updated description',
      });

      // Then
      expect(updated.resource.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated description');
    });

    it('존재하지 않는 Space 업데이트 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(
        service.update(nonExistentId, { title: 'New Title' })
      ).rejects.toThrow(AppError);
      await expect(
        service.update(nonExistentId, { title: 'New Title' })
      ).rejects.toMatchObject({
        code: 'space.fetch.notFound',
      });
    });

    it('@Transactional로 title과 description 업데이트가 원자적이어야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'Original Title',
        parentPath: 'root',
        description: 'Original description',
      });

      const spaceId = space.id;
      em.clear();

      // When
      const updated = await service.update(spaceId, {
        title: 'Updated Title',
        description: 'Updated description',
      });

      em.clear();

      // Then - DB에서 직접 조회 시 둘 다 업데이트되어야 함
      const found = await repository.findById(spaceId);
      expect(found?.resource.title).toBe('Updated Title');
      expect(found?.description).toBe('Updated description');
    });
  });

  describe('delete', () => {
    it('Space를 삭제해야 함', async () => {
      // Given
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const space = await service.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        title: 'To Be Deleted',
        parentPath: 'root',
      });

      const spaceId = space.id;
      em.clear();

      // When
      await service.delete(spaceId);
      em.clear();

      // Then
      const found = await repository.findById(spaceId);
      expect(found).toBeNull();
    });

    it('존재하지 않는 Space 삭제 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(service.delete(nonExistentId)).rejects.toThrow(AppError);
      await expect(service.delete(nonExistentId)).rejects.toMatchObject({
        code: 'space.fetch.notFound',
      });
    });
  });
});
