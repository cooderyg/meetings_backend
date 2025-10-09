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
} from '../../../test/fixtures/meeting.fixture';
import { ResourceRepository } from './resource.repository';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from './entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { v4 as uuid } from 'uuid';

describe('ResourceRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let resourceRepository: ResourceRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'resource-integration-test';

  // Helper to create a workspace for testing

  // Helper to create a user for testing

  // Helper to create a workspace member for testing

  // Helper to create a resource for testing

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
    it('ID로 리소스를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const user = await createUserFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        type: ResourceType.SPACE,
        title: 'Test Space',
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
        title: 'Resource 1',
      });
      const resource2 = await createResourceFixture(em, {
        workspace: workspace1,
        owner: member1,
        title: 'Resource 2',
      });
      const resource3 = await createResourceFixture(em, {
        workspace: workspace2,
        owner: member2,
        title: 'Resource 3',
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
        title: 'User1 Resource 1',
      });
      const resource2 = await createResourceFixture(em, {
        workspace,
        owner: member1,
        title: 'User1 Resource 2',
      });
      const resource3 = await createResourceFixture(em, {
        workspace,
        owner: member2,
        title: 'User2 Resource',
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        title: 'Original Title',
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
      const workspace = await createWorkspaceFixture(em);
      const workspaceMember = await createWorkspaceMemberFixture(em, {
        workspace,
      });
      const resource = await createResourceFixture(em, {
        workspace,
        owner: workspaceMember,
        title: 'To Be Deleted',
      });

      // When
      await resourceRepository.delete(resource.id);

      // Then
      const foundResource = await resourceRepository.findById(resource.id);
      expect(foundResource).toBeNull();
    });
  });
});
