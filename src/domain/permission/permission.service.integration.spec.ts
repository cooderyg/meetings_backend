import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { PermissionService } from './permission.service';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { PermissionModule } from './permission.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { MeetingFactory } from '../../../test/factories/meeting.factory';
import { createWorkspaceMemberFixture } from '../../../test/fixtures/meeting.fixture';

/**
 * PermissionService 통합 테스트
 *
 * NOTE: PermissionService는 복잡한 권한 체크 로직을 포함하고 있으며,
 * PermissionRepository가 factory 패턴으로 제공되어 일부 메서드가 런타임에만 사용 가능합니다.
 *
 * 이 테스트는 기본적인 서비스 통합과 데이터 구조 생성을 검증합니다.
 * 상세한 권한 로직 테스트는 별도의 E2E 테스트나 단위 테스트에서 수행해야 합니다.
 */
describe('PermissionService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: PermissionService;
  const containerKey = 'permission-service-integration-test';

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(PermissionModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<PermissionService>(PermissionService);

    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    await orm.em.begin();
  });

  afterEach(async () => {
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

  describe('Service Integration', () => {
    it('PermissionService가 정상적으로 주입되어야 함', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PermissionService);
    });
  });

  describe('Data Structure Creation', () => {
    it('Workspace와 WorkspaceMember를 생성할 수 있어야 함', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });

      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      expect(member).toBeDefined();
      expect(member.id).toBeDefined();
      expect(member.workspace.id).toBe(workspace.id);
    });

    it('Meeting을 생성할 수 있어야 함', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em)
        .forWorkspace(workspace)
        .create();

      expect(meeting).toBeDefined();
      expect(meeting.id).toBeDefined();
      expect(meeting.workspace.id).toBe(workspace.id);
      expect(meeting.resource).toBeDefined();
    });

    it('여러 도메인 엔티티를 함께 생성할 수 있어야 함', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await new MeetingFactory(em)
        .forWorkspace(workspace)
        .create();

      em.clear();

      expect(workspace.id).toBeDefined();
      expect(member.id).toBeDefined();
      expect(meeting.id).toBeDefined();
    });
  });
});
