import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { WorkspaceMemberRoleModule } from './workspace-member-role.module';
import { WorkspaceMemberRoleRepository } from './workspace-member-role.repository';
import { WorkspaceMemberRole } from './entity/workspace-member-role.entity';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import {
  createWorkspaceMemberFixture,
  createRoleFixture,
} from '../../../test/fixtures/meeting.fixture';

describe('WorkspaceMemberRoleRepository Integration Tests', () => {
  let module: TestingModule;
  let repository: WorkspaceMemberRoleRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'workspace-member-role-integration-test';

  beforeAll(async () => {
    module = await TestModuleBuilder.create()
      .withModule(WorkspaceMemberRoleModule)
      .withTestcontainer(containerKey)
      .build();

    repository = module.get<WorkspaceMemberRoleRepository>(
      WorkspaceMemberRoleRepository
    );
    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  afterAll(async () => {
    if (em) {
      await em.getConnection().close(true);
    }
    if (module) {
      await module.close();
    }
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  });

  beforeEach(async () => {
    await em.begin();
  });

  afterEach(async () => {
    await em.rollback();
  });

  describe('create', () => {
    it('WorkspaceMemberRole을 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const role = await createRoleFixture(em);

      const workspaceMemberRole = new WorkspaceMemberRole();
      workspaceMemberRole.workspaceMember = member;
      workspaceMemberRole.role = role;

      // When
      const created = await repository.create(workspaceMemberRole);

      // Then
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.workspaceMember.id).toBe(member.id);
      expect(created.role.id).toBe(role.id);
    });

    it('생성된 WorkspaceMemberRole이 데이터베이스에 저장되어야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const role = await createRoleFixture(em);

      const workspaceMemberRole = new WorkspaceMemberRole();
      workspaceMemberRole.workspaceMember = member;
      workspaceMemberRole.role = role;

      // When
      const created = await repository.create(workspaceMemberRole);

      // Then
      const found = await em.findOne(WorkspaceMemberRole, { id: created.id });
      expect(found).toBeDefined();
      expect(found?.workspaceMember.id).toBe(member.id);
      expect(found?.role.id).toBe(role.id);
    });
  });
});
