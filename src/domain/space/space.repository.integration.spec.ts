import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { createUserFixture } from '../../../test/fixtures/user.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import {
  createWorkspaceMemberFixture,
  createResourceFixture,
  createSpaceFixture,
} from '../../../test/fixtures/meeting.fixture';
import { SpaceRepository } from './space.repository';
import { Space } from './entity/space.entity';
import { Resource } from '../resource/entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { v4 as uuid } from 'uuid';

describe('SpaceRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let spaceRepository: SpaceRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'space-integration-test';

  // Helper to create a workspace for testing

  // Helper to create a user for testing

  // Helper to create a workspace member for testing

  // Helper to create a resource for testing

  // Helper to create a space for testing

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
    // 각 테스트를 트랜잭션으로 격리
    await orm.em.begin();
  });

  afterEach(async () => {
    // 트랜잭션 롤백으로 데이터 초기화
    await orm.em.rollback();
    orm.em.clear();
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        title: 'Test Space Resource',
      });
      const space = await createSpaceFixture(em, {
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
      const workspace1 = await createWorkspaceFixture(em, {
        name: 'Workspace 1',
      });
      const workspace2 = await createWorkspaceFixture(em, {
        name: 'Workspace 2',
      });
      const member1 = await createWorkspaceMemberFixture(em, {
        workspace: workspace1,
      });
      const member2 = await createWorkspaceMemberFixture(em, {
        workspace: workspace2,
      });

      const resource1 = await createResourceFixture(em, {
        workspace: workspace1,
        owner: member1,
        title: 'Space 1 Resource',
      });
      const resource2 = await createResourceFixture(em, {
        workspace: workspace1,
        owner: member1,
        title: 'Space 2 Resource',
      });
      const resource3 = await createResourceFixture(em, {
        workspace: workspace2,
        owner: member2,
        title: 'Space 3 Resource',
      });

      const space1 = await createSpaceFixture(em, {
        resource: resource1,
        workspace: workspace1,
        description: 'Space 1',
      });
      const space2 = await createSpaceFixture(em, {
        resource: resource2,
        workspace: workspace1,
        description: 'Space 2',
      });
      const space3 = await createSpaceFixture(em, {
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
      const workspace = await createWorkspaceFixture(em);
      const user1 = await createUserFixture(em, { email: 'user1@test.com' });
      const user2 = await createUserFixture(em, { email: 'user2@test.com' });
      const member1 = await createWorkspaceMemberFixture(em, {
        workspace,
        user: user1,
      });
      const member2 = await createWorkspaceMemberFixture(em, {
        workspace,
        user: user2,
      });

      const resource1 = await createResourceFixture(em, {
        workspace,
        owner: member1,
        title: 'User1 Space 1 Resource',
      });
      const resource2 = await createResourceFixture(em, {
        workspace,
        owner: member1,
        title: 'User1 Space 2 Resource',
      });
      const resource3 = await createResourceFixture(em, {
        workspace,
        owner: member2,
        title: 'User2 Space Resource',
      });

      const space1 = await createSpaceFixture(em, {
        resource: resource1,
        workspace,
        description: 'User1 Space 1',
      });
      const space2 = await createSpaceFixture(em, {
        resource: resource2,
        workspace,
        description: 'User1 Space 2',
      });
      const space3 = await createSpaceFixture(em, {
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        title: 'New Space Resource',
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        title: 'Space Resource',
      });
      const space = await createSpaceFixture(em, {
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        title: 'To Be Deleted Resource',
      });
      const space = await createSpaceFixture(em, {
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
