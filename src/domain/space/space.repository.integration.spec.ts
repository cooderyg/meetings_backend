import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { SpaceRepository } from './space.repository';
import { Space } from './entity/space.entity';
import { Resource } from '../resource/entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { SpaceFactory } from '../../../test/factories/space.factory';
import { ResourceFactory } from '../../../test/factories/resource.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { UserFactory } from '../../../test/factories/user.factory';
import { v4 as uuid } from 'uuid';

describe('SpaceRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let spaceRepository: SpaceRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'space-integration-test';

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

  // Helper to create a space for testing
  const createSpace = async (overrides: Partial<Space> = {}) => {
    const space = SpaceFactory.create(overrides);
    await em.persistAndFlush(space);
    return space;
  };

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드 (Repository만 테스트)
    module = await TestModuleBuilder.create()
      .withTestcontainer(containerKey)
      .build();

    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // Repository 직접 생성
    spaceRepository = new SpaceRepository(em.getRepository(Space));

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    // 각 테스트 전에 데이터 초기화
    await em.execute('TRUNCATE TABLE "spaces" CASCADE');
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
    it('ID로 스페이스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        title: 'Test Space Resource',
        path: 'root.test-space',
      });
      const space = await createSpace({
        resource,
        workspace,
        description: 'Test Space Description',
      });

      // When
      const foundSpace = await spaceRepository.findById(space.id);

      // Then
      expect(foundSpace).toBeDefined();
      expect(foundSpace?.id).toBe(space.id);
      expect(foundSpace?.description).toBe('Test Space Description');
      expect(foundSpace?.resource.id).toBe(resource.id);
    });

    it('존재하지 않는 ID로 스페이스를 찾으면 null을 반환해야 함', async () => {
      // When
      const foundSpace = await spaceRepository.findById(
        '00000000-0000-0000-0000-000000000000'
      );

      // Then
      expect(foundSpace).toBeNull();
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 스페이스를 찾아야 함', async () => {
      // Given
      const workspace1 = await createWorkspace({ name: 'Workspace 1' });
      const workspace2 = await createWorkspace({ name: 'Workspace 2' });
      const user = await createUser();
      const member1 = await createWorkspaceMember(workspace1, user);
      const member2 = await createWorkspaceMember(workspace2, user);

      const resource1 = await createResource({
        workspace: workspace1,
        owner: member1,
        title: 'Space 1 Resource',
        path: 'root.space1',
      });
      const resource2 = await createResource({
        workspace: workspace1,
        owner: member1,
        title: 'Space 2 Resource',
        path: 'root.space2',
      });
      const resource3 = await createResource({
        workspace: workspace2,
        owner: member2,
        title: 'Space 3 Resource',
        path: 'root.space3',
      });

      const space1 = await createSpace({
        resource: resource1,
        workspace: workspace1,
        description: 'Space 1',
      });
      const space2 = await createSpace({
        resource: resource2,
        workspace: workspace1,
        description: 'Space 2',
      });
      const space3 = await createSpace({
        resource: resource3,
        workspace: workspace2,
        description: 'Space 3',
      });

      // When
      const workspace1Spaces = await spaceRepository.findByWorkspace(
        workspace1.id
      );

      // Then
      expect(workspace1Spaces).toHaveLength(2);
      expect(workspace1Spaces.map((s) => s.id)).toContain(space1.id);
      expect(workspace1Spaces.map((s) => s.id)).toContain(space2.id);
      expect(workspace1Spaces.map((s) => s.id)).not.toContain(space3.id);
    });
  });

  describe('findByWorkspaceAndUserId', () => {
    it('워크스페이스와 사용자 ID로 스페이스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user1 = await createUser({ email: 'user1@test.com' });
      const user2 = await createUser({ email: 'user2@test.com' });
      const member1 = await createWorkspaceMember(workspace, user1);
      const member2 = await createWorkspaceMember(workspace, user2);

      const resource1 = await createResource({
        workspace,
        owner: member1,
        title: 'User1 Space 1 Resource',
        path: 'root.user1.space1',
      });
      const resource2 = await createResource({
        workspace,
        owner: member1,
        title: 'User1 Space 2 Resource',
        path: 'root.user1.space2',
      });
      const resource3 = await createResource({
        workspace,
        owner: member2,
        title: 'User2 Space Resource',
        path: 'root.user2.space',
      });

      const space1 = await createSpace({
        resource: resource1,
        workspace,
        description: 'User1 Space 1',
      });
      const space2 = await createSpace({
        resource: resource2,
        workspace,
        description: 'User1 Space 2',
      });
      const space3 = await createSpace({
        resource: resource3,
        workspace,
        description: 'User2 Space',
      });

      // When
      const user1Spaces = await spaceRepository.findByWorkspaceAndUserId(
        workspace.id,
        user1.id
      );

      // Then
      expect(user1Spaces).toHaveLength(2);
      expect(user1Spaces.map((s) => s.id)).toContain(space1.id);
      expect(user1Spaces.map((s) => s.id)).toContain(space2.id);
      expect(user1Spaces.map((s) => s.id)).not.toContain(space3.id);
    });
  });

  describe('create', () => {
    it('새 스페이스를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        title: 'New Space Resource',
        path: 'root.new-space',
      });

      const createData = {
        resource,
        workspace,
        description: 'New Space Description',
      };

      // When
      const createdSpace = await spaceRepository.create(createData);

      // Then
      expect(createdSpace).toBeDefined();
      expect(createdSpace.description).toBe('New Space Description');
      expect(createdSpace.resource.id).toBe(resource.id);
      expect(createdSpace.workspace.id).toBe(workspace.id);
    });
  });

  describe('updateSpace', () => {
    it('스페이스를 업데이트해야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        title: 'Space Resource',
        path: 'root.space',
      });
      const space = await createSpace({
        resource,
        workspace,
        description: 'Original Description',
      });

      const updateData = { description: 'Updated Description' };

      // When
      const updatedSpace = await spaceRepository.updateSpace(space, updateData);

      // Then
      expect(updatedSpace.description).toBe('Updated Description');
      const foundSpace = await spaceRepository.findById(space.id);
      expect(foundSpace?.description).toBe('Updated Description');
    });
  });

  describe('delete', () => {
    it('스페이스를 삭제해야 함', async () => {
      // Given
      const workspace = await createWorkspace();
      const user = await createUser();
      const workspaceMember = await createWorkspaceMember(workspace, user);
      const resource = await createResource({
        workspace,
        owner: workspaceMember,
        title: 'To Be Deleted Resource',
        path: 'root.to-be-deleted',
      });
      const space = await createSpace({
        resource,
        workspace,
        description: 'To Be Deleted',
      });

      // When
      await spaceRepository.delete(space.id);

      // Then
      const foundSpace = await spaceRepository.findById(space.id);
      expect(foundSpace).toBeNull();
    });
  });
});
