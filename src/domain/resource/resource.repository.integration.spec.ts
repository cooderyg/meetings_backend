import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { ResourceRepository } from './resource.repository';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from './entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { ResourceFactory } from '../../../test/factories/resource.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { UserFactory } from '../../../test/factories/user.factory';
import { v4 as uuid } from 'uuid';

describe('ResourceRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let resourceRepository: ResourceRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'resource-integration-test';

  // Helper to create a workspace for testing
  const createWorkspace = async (overrides: Partial<Workspace> = {}) => {
    const workspace = WorkspaceFactory.create(overrides);
    await em.persistAndFlush(workspace);
    return workspace;
  };

  // Helper to create a user for testing
  const createUser = async (overrides: Partial<User> = {}) => {
    const user = UserFactory.create(overrides);
    await em.persistAndFlush(user);
    return user;
  };

  // Helper to create a workspace member for testing
  const createWorkspaceMember = async (
    workspace: Workspace,
    user: User,
    overrides: Partial<WorkspaceMember> = {}
  ) => {
    const workspaceMember = new WorkspaceMember();
    Object.assign(workspaceMember, {
      id: uuid(),
      workspace,
      user,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    await em.persistAndFlush(workspaceMember);
    return workspaceMember;
  };

  // Helper to create a resource for testing
  const createResource = async (overrides: Partial<Resource> = {}) => {
    const resource = ResourceFactory.create(overrides);
    await em.persistAndFlush(resource);
    return resource;
  };

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드 (Repository만 테스트)
    module = await TestModuleBuilder.create()
      .withTestcontainer(containerKey)
      .build();

    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // Repository 직접 생성
    resourceRepository = new ResourceRepository(em.getRepository(Resource));

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    // 각 테스트 전에 데이터 초기화
    await em.execute('TRUNCATE TABLE "resources" CASCADE');
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

  describe('findById', () => {
    it('ID로 리소스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        type: ResourceType.SPACE,
        title: 'Test Space',
        path: 'root.test-space',
      });

      // When
      const foundResource = await resourceRepository.findById(resource.id);

      // Then
      expect(foundResource).toBeDefined();
      expect(foundResource?.id).toBe(resource.id);
      expect(foundResource?.title).toBe('Test Space');
      expect(foundResource?.type).toBe(ResourceType.SPACE);
    });

    it('존재하지 않는 ID로 리소스를 찾으면 null을 반환해야 함', async () => {
      // When
      const foundResource = await resourceRepository.findById(
        '00000000-0000-0000-0000-000000000000'
      );

      // Then
      expect(foundResource).toBeNull();
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 리소스를 찾아야 함', async () => {
      // Given
      const workspace1 = await createWorkspace({ name: 'Workspace 1' });
      const workspace2 = await createWorkspace({ name: 'Workspace 2' });
      const user = await createUser();
      const member1 = await createWorkspaceMember(workspace1, user);
      const member2 = await createWorkspaceMember(workspace2, user);

      const resource1 = await createResource({
        workspace: workspace1,
        owner: member1,
        title: 'Resource 1',
        path: 'root.resource1',
      });
      const resource2 = await createResource({
        workspace: workspace1,
        owner: member1,
        title: 'Resource 2',
        path: 'root.resource2',
      });
      const resource3 = await createResource({
        workspace: workspace2,
        owner: member2,
        title: 'Resource 3',
        path: 'root.resource3',
      });

      // When
      const workspace1Resources = await resourceRepository.findByWorkspace(
        workspace1.id
      );

      // Then
      expect(workspace1Resources).toHaveLength(2);
      expect(workspace1Resources.map((r) => r.id)).toContain(resource1.id);
      expect(workspace1Resources.map((r) => r.id)).toContain(resource2.id);
      expect(workspace1Resources.map((r) => r.id)).not.toContain(resource3.id);
    });
  });

  describe('findByOwner', () => {
    it('소유자의 모든 리소스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user1 = await createUser({ email: 'user1@test.com' });
      const user2 = await createUser({ email: 'user2@test.com' });
      const member1 = await createWorkspaceMember(workspace, user1);
      const member2 = await createWorkspaceMember(workspace, user2);

      const resource1 = await createResource({
        workspace,
        owner: member1,
        title: 'User1 Resource 1',
        path: 'root.user1.resource1',
      });
      const resource2 = await createResource({
        workspace,
        owner: member1,
        title: 'User1 Resource 2',
        path: 'root.user1.resource2',
      });
      const resource3 = await createResource({
        workspace,
        owner: member2,
        title: 'User2 Resource',
        path: 'root.user2.resource',
      });

      // When
      const member1Resources = await resourceRepository.findByOwner(member1.id);

      // Then
      expect(member1Resources).toHaveLength(2);
      expect(member1Resources.map((r) => r.id)).toContain(resource1.id);
      expect(member1Resources.map((r) => r.id)).toContain(resource2.id);
      expect(member1Resources.map((r) => r.id)).not.toContain(resource3.id);
    });
  });

  describe('create', () => {
    it('새 리소스를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const createData = {
        workspace,
        owner: workspaceMember,
        type: ResourceType.SPACE,
        title: 'New Space',
        path: 'root.new-space',
      };

      // When
      const createdResource = await resourceRepository.create(createData);

      // Then
      expect(createdResource).toBeDefined();
      expect(createdResource.title).toBe('New Space');
      expect(createdResource.type).toBe(ResourceType.SPACE);
      expect(createdResource.workspace.id).toBe(workspace.id);
      expect(createdResource.owner.id).toBe(workspaceMember.id);
    });
  });

  describe('update', () => {
    it('리소스를 업데이트해야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        title: 'Original Title',
        path: 'root.original',
      });

      const updateData = { title: 'Updated Title' };

      // When
      const updatedResource = await resourceRepository.update(
        resource.id,
        updateData
      );

      // Then
      expect(updatedResource.title).toBe('Updated Title');
      const foundResource = await resourceRepository.findById(resource.id);
      expect(foundResource?.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('리소스를 삭제해야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        title: 'To Be Deleted',
        path: 'root.to-be-deleted',
      });

      // When
      await resourceRepository.delete(resource.id);

      // Then
      const foundResource = await resourceRepository.findById(resource.id);
      expect(foundResource).toBeNull();
    });
  });
});
