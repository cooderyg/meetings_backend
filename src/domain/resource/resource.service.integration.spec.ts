import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ResourceService } from './resource.service';
import { ResourceRepository } from './resource.repository';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from './entity/resource.entity';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import { createWorkspaceMemberFixture } from '../../../test/fixtures/meeting.fixture';
import { AppError } from '../../shared/exception/app.error';
import { ResourceModule } from './resource.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';

describe('ResourceService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: ResourceService;
  let repository: ResourceRepository;
  const containerKey = 'resource-service-integration-test';

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    const module = await TestModuleBuilder.create()
      .withModule(ResourceModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<ResourceService>(ResourceService);
    repository = module.get<ResourceRepository>(ResourceRepository);

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
    it('Resource를 생성하고 ltree 경로가 올바르게 설정되어야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When
      const resource = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Test Resource',
        parentPath: '/',
      });

      // Then
      expect(resource).toBeDefined();
      expect(resource.id).toBeDefined();
      expect(resource.title).toBe('Test Resource');
      expect(resource.type).toBe(ResourceType.MEETING);
      expect(resource.visibility).toBe(ResourceVisibility.PUBLIC); // default value
      expect(resource.owner.id).toBe(member.id);
      expect(resource.workspace.id).toBe(workspace.id);
      expect(resource.path).toMatch(/^r\d+$/); // root level: r{timestamp}
    });

    it('parentPath가 주어지면 계층 구조 경로를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When
      const resource = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.SPACE,
        title: 'Child Resource',
        parentPath: 'root.parent',
      });

      // Then
      expect(resource.path).toMatch(/^root\.parent\.r\d+$/);
    });

    it('visibility를 지정하여 Resource를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When
      const resource = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Private Resource',
        visibility: ResourceVisibility.PRIVATE,
      });

      // Then
      expect(resource.visibility).toBe(ResourceVisibility.PRIVATE);
    });

    it('존재하지 않는 워크스페이스로 생성 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentWorkspaceId = '00000000-0000-0000-0000-000000000000';
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // When/Then
      await expect(
        service.create({
          workspaceId: nonExistentWorkspaceId,
          ownerId: member.id,
          type: ResourceType.MEETING,
          title: 'Test',
        })
      ).rejects.toThrow(AppError);
    });

    it('존재하지 않는 소유자로 생성 시 AppError를 던져야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const nonExistentMemberId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(
        service.create({
          workspaceId: workspace.id,
          ownerId: nonExistentMemberId,
          type: ResourceType.MEETING,
          title: 'Test',
        })
      ).rejects.toThrow(AppError);
    });

    it('다른 워크스페이스의 멤버로 생성 시 AppError를 던져야 함', async () => {
      // Given
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);
      const member2 = await createWorkspaceMemberFixture(em, {
        workspace: workspace2,
      });

      // When/Then
      await expect(
        service.create({
          workspaceId: workspace1.id,
          ownerId: member2.id, // workspace2의 멤버
          type: ResourceType.MEETING,
          title: 'Test',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('findById', () => {
    it('ID로 Resource를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const created = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Find Test',
      });

      em.clear();

      // When
      const found = await service.findById(created.id);

      // Then
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Find Test');
    });

    it('존재하지 않는 Resource에 대해 null을 반환해야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When
      const found = await service.findById(nonExistentId);

      // Then
      expect(found).toBeNull();
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 Resource를 반환해야 함', async () => {
      // Given
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);
      const member1 = await createWorkspaceMemberFixture(em, {
        workspace: workspace1,
      });
      const member2 = await createWorkspaceMemberFixture(em, {
        workspace: workspace2,
      });

      await service.create({
        workspaceId: workspace1.id,
        ownerId: member1.id,
        type: ResourceType.MEETING,
        title: 'Resource 1',
      });
      await service.create({
        workspaceId: workspace1.id,
        ownerId: member1.id,
        type: ResourceType.SPACE,
        title: 'Resource 2',
      });
      await service.create({
        workspaceId: workspace2.id,
        ownerId: member2.id,
        type: ResourceType.MEETING,
        title: 'Resource 3',
      });

      em.clear();

      // When
      const resources = await service.findByWorkspace(workspace1.id);

      // Then
      expect(resources).toHaveLength(2);
      expect(resources.every((r) => r.workspace.id === workspace1.id)).toBe(
        true
      );
    });
  });

  describe('findByWorkspaceAndType', () => {
    it('워크스페이스와 타입으로 Resource를 필터링해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Meeting 1',
      });
      await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Meeting 2',
      });
      await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.SPACE,
        title: 'Space 1',
      });

      em.clear();

      // When
      const meetings = await service.findByWorkspaceAndType(
        workspace.id,
        ResourceType.MEETING
      );
      const spaces = await service.findByWorkspaceAndType(
        workspace.id,
        ResourceType.SPACE
      );

      // Then
      expect(meetings).toHaveLength(2);
      expect(meetings.every((r) => r.type === ResourceType.MEETING)).toBe(true);
      expect(spaces).toHaveLength(1);
      expect(spaces.every((r) => r.type === ResourceType.SPACE)).toBe(true);
    });
  });

  describe('update', () => {
    it('Resource의 title을 업데이트해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const resource = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Original Title',
      });

      em.clear();

      // When
      const updated = await service.update(resource.id, {
        title: 'Updated Title',
      });

      // Then
      expect(updated.title).toBe('Updated Title');
    });

    it('Resource의 visibility를 업데이트해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const resource = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'Test',
        visibility: ResourceVisibility.PUBLIC,
      });

      em.clear();

      // When
      const updated = await service.update(resource.id, {
        visibility: ResourceVisibility.PRIVATE,
      });

      // Then
      expect(updated.visibility).toBe(ResourceVisibility.PRIVATE);
    });

    it('존재하지 않는 Resource 업데이트 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(
        service.update(nonExistentId, { title: 'New Title' })
      ).rejects.toThrow(AppError);
      await expect(
        service.update(nonExistentId, { title: 'New Title' })
      ).rejects.toMatchObject({
        code: 'resource.fetch.notFound',
      });
    });
  });

  describe('deleteResource', () => {
    it('Resource를 삭제해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const resource = await service.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        type: ResourceType.MEETING,
        title: 'To Be Deleted',
      });

      const resourceId = resource.id;
      em.clear();

      // When
      await service.deleteResource(resourceId);
      em.clear();

      // Then
      const found = await repository.findById(resourceId);
      expect(found).toBeNull();
    });

    it('존재하지 않는 Resource 삭제 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(service.deleteResource(nonExistentId)).rejects.toThrow(
        AppError
      );
      await expect(service.deleteResource(nonExistentId)).rejects.toMatchObject(
        {
          code: 'resource.fetch.notFound',
        }
      );
    });
  });
});
