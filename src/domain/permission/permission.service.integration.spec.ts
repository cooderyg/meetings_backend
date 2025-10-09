import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { PermissionService } from './permission.service';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { PermissionModule } from './permission.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { initializePermissionData } from '../../../test/utils/db-helpers';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import {
  createMeetingFixture,
  createWorkspaceMemberFixture,
  createSpaceFixture,
  createResourceFixture,
  createRoleFixture,
} from '../../../test/fixtures/meeting.fixture';
import {
  createMemberResourcePermissionFixture,
  createExpiredMemberResourcePermissionFixture,
  createDenyMemberResourcePermissionFixture,
} from '../../../test/fixtures/permission.fixture';
import { Action, ResourceSubject } from './entity/permission.entity';
import { SystemRole } from '../role/enum/system-role.enum';
import {
  ResourceVisibility,
  ResourceType,
} from '../resource/entity/resource.entity';

/**
 * PermissionService 통합 테스트
 *
 * 3계층 권한 시스템 검증:
 * 1. Visibility 기반 접근 제어 (PUBLIC/PRIVATE)
 * 2. Individual Resource Permission
 * 3. Role 기반 권한
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

    // 권한 시스템 초기화 (Permission, Role, RolePermission)
    await initializePermissionData(em);
  }, 30000);

  beforeEach(async () => {
    // ⚠️ 트랜잭션 시작하면 Permission/Role 데이터가 롤백되어 삭제됨
    // Integration 테스트에서는 수동으로 데이터 정리 필요
  });

  afterEach(async () => {
    // 테스트 데이터 수동 정리 (FK 순서 고려)
    await em.execute('DELETE FROM member_resource_permissions');
    await em.execute('DELETE FROM meeting_participants');
    await em.execute('DELETE FROM meetings');
    await em.execute('DELETE FROM spaces');
    await em.execute('DELETE FROM resources'); // WorkspaceMember FK 제거 후
    await em.execute(
      'DELETE FROM workspace_member_roles WHERE workspace_member_id IS NOT NULL'
    );
    await em.execute('DELETE FROM workspace_members');
    await em.execute('DELETE FROM workspaces');
    await em.execute('DELETE FROM users');
    await em.execute('DELETE FROM roles WHERE workspace_id IS NOT NULL'); // 워크스페이스 커스텀 Role만 삭제

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

  describe('hasSpacePermission()', () => {
    describe('Role 기반 권한', () => {
      it('OWNER 권한을 가진 멤버는 Space에 대한 READ 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resource = await createResourceFixture(em, {
          workspace,
          owner: member,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 권한을 가진 멤버는 Space에 대한 READ 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 권한을 가진 멤버는 Space에 대한 UPDATE 권한이 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.UPDATE,
          space.id
        );

        expect(hasPermission).toBe(false);
      });
    });

    describe('Visibility 기반 접근 제어', () => {
      it('PUBLIC Space는 모든 워크스페이스 멤버가 읽을 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('PRIVATE Space는 소유자가 아닌 멤버가 읽을 수 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(false);
      });

      it('PRIVATE Space는 소유자가 읽을 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasSpacePermission(
          owner.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(true);
      });
    });
  });

  describe('hasMeetingPermission()', () => {
    describe('Role 기반 권한', () => {
      it('OWNER 권한을 가진 멤버는 Meeting에 대한 READ 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resource = await createResourceFixture(em, {
          workspace,
          owner: member,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 권한을 가진 멤버는 PUBLIC Meeting에 대한 READ 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });
    });

    describe('Space 권한 상속', () => {
      it('Space에 대한 READ 권한이 있으면 하위 Meeting에 대한 READ 권한도 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PUBLIC Space 생성
        const spaceResource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        spaceResource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource: spaceResource,
        });

        // Space 하위에 PUBLIC Meeting 생성
        const meetingResource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        meetingResource.path = `${spaceResource.path}.${Date.now()}`;
        meetingResource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource: meetingResource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('PRIVATE Space 하위의 PUBLIC Meeting은 Space 권한이 없으면 읽을 수 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Space 생성
        const spaceResource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        spaceResource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource: spaceResource,
        });

        // Space 하위에 PUBLIC Meeting 생성
        const meetingResource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        meetingResource.path = `${spaceResource.path}.${Date.now()}`;
        meetingResource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource: meetingResource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(false);
      });
    });

    describe('Visibility 기반 접근 제어', () => {
      it('PUBLIC Meeting은 READ 권한이 있는 멤버가 읽을 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        resource.visibility = ResourceVisibility.PUBLIC;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('PRIVATE Meeting은 소유자가 아닌 멤버가 읽을 수 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(false);
      });

      it('PRIVATE Meeting은 소유자가 읽을 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const owner = await createWorkspaceMemberFixture(em, { workspace });
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          owner.id,
          Action.READ,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });
    });
  });

  describe('Individual Resource Permission (MemberResourcePermission)', () => {
    describe('명시적 권한 부여', () => {
      it('PRIVATE Space에 명시적 READ 권한이 부여된 멤버는 접근할 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Space 생성 (소유자만 접근 가능)
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // Individual Permission으로 명시적 READ 권한 부여
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.READ,
          resourceSubject: ResourceSubject.SPACE,
          resourcePath: resource.path,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('PRIVATE Meeting에 명시적 UPDATE 권한이 부여된 멤버는 수정할 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Meeting 생성
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Private Meeting',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Individual Permission으로 명시적 UPDATE 권한 부여
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.UPDATE,
          resourceSubject: ResourceSubject.MEETING,
          resourcePath: resource.path,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.UPDATE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('소유자가 아닌 멤버에게 Individual Permission으로 접근 권한 부여 시 접근 가능해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Space 생성
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // 명시적 권한 부여 전: 접근 불가
        const beforePermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );
        expect(beforePermission).toBe(false);

        // Individual Permission 부여
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.READ,
          resourceSubject: ResourceSubject.SPACE,
          resourcePath: resource.path,
        });

        // 명시적 권한 부여 후: 접근 가능
        const afterPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );
        expect(afterPermission).toBe(true);
      });
    });

    describe('명시적 권한 거부', () => {
      it('OWNER 역할이어도 Individual Permission에서 거부하면 접근 불가해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const owner = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });

        // PRIVATE Space 생성 (owner 본인 소유)
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // Individual Permission으로 소유자 본인에게 DENY
        // 소유자는 Visibility에서 통과하지만, Individual Permission으로 거부됨
        await createDenyMemberResourcePermissionFixture(em, {
          workspaceMember: owner,
          workspace,
          action: Action.UPDATE,
          resourceSubject: ResourceSubject.SPACE,
          resourcePath: resource.path,
        });

        const hasPermission = await service.hasSpacePermission(
          owner.id,
          Action.UPDATE,
          space.id
        );

        // 소유자이자 OWNER 역할임에도 Individual Permission DENY로 접근 불가
        expect(hasPermission).toBe(false);
      });

      it('PRIVATE 리소스에 명시적 ALLOW 후 DENY로 변경 시 접근 불가해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Meeting 생성
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Private Meeting',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // 1단계: Individual Permission ALLOW 부여
        const allowPermission = await createMemberResourcePermissionFixture(
          em,
          {
            workspaceMember: member,
            workspace,
            action: Action.READ,
            resourceSubject: ResourceSubject.MEETING,
            resourcePath: resource.path,
            isAllowed: true,
          }
        );

        const withAllowPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );
        expect(withAllowPermission).toBe(true);

        // 2단계: ALLOW → DENY로 변경
        allowPermission.isAllowed = false;
        await em.flush();

        // DENY로 변경 후: 접근 불가
        const afterDenyPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );
        expect(afterDenyPermission).toBe(false);
      });
    });

    describe('만료된 권한', () => {
      it('expiresAt이 과거인 Permission은 무시되어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Space 생성
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // 만료된 Individual Permission 생성
        const expiredPermission =
          await createExpiredMemberResourcePermissionFixture(em, {
            workspaceMember: member,
            workspace,
            action: Action.READ,
            resourceSubject: ResourceSubject.SPACE,
            resourcePath: resource.path,
          });

        // 만료 상태 확인
        expect(expiredPermission.isExpired()).toBe(true);
        expect(expiredPermission.isActive()).toBe(false);

        // 만료된 권한은 무시되어 접근 불가
        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );
        expect(hasPermission).toBe(false);
      });

      it('expiresAt이 미래인 Permission은 유효해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Space 생성
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // 1시간 후 만료되는 Individual Permission 생성
        const futureExpiry = new Date(Date.now() + 3600000);
        const validPermission = await createMemberResourcePermissionFixture(
          em,
          {
            workspaceMember: member,
            workspace,
            action: Action.READ,
            resourceSubject: ResourceSubject.SPACE,
            resourcePath: resource.path,
            expiresAt: futureExpiry,
          }
        );

        // 아직 만료되지 않음
        expect(validPermission.isExpired()).toBe(false);
        expect(validPermission.isActive()).toBe(true);

        // 유효한 권한으로 접근 가능
        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );
        expect(hasPermission).toBe(true);
      });
    });

    describe('권한 우선순위', () => {
      it('Individual Permission(ALLOW)이 Role 권한보다 우선해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Space 생성 (CAN_VIEW는 접근 불가)
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // Role 권한만으로는 접근 불가
        const beforePermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );
        expect(beforePermission).toBe(false);

        // Individual Permission 부여 (Role 권한보다 우선)
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.READ,
          resourceSubject: ResourceSubject.SPACE,
          resourcePath: resource.path,
        });

        // Individual Permission으로 접근 가능
        const afterPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );
        expect(afterPermission).toBe(true);
      });

      it('Individual Permission(DENY)이 Role 권한보다 우선해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const owner = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });

        // PRIVATE Space 생성 (소유자 본인 소유)
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Private Space',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const space = await createSpaceFixture(em, {
          workspace,
          resource,
        });

        // Role 권한(OWNER) + 소유자이므로 접근 가능
        const beforePermission = await service.hasSpacePermission(
          owner.id,
          Action.UPDATE,
          space.id
        );
        expect(beforePermission).toBe(true);

        // Individual Permission으로 소유자 본인에게 명시적 거부
        await createDenyMemberResourcePermissionFixture(em, {
          workspaceMember: owner,
          workspace,
          action: Action.UPDATE,
          resourceSubject: ResourceSubject.SPACE,
          resourcePath: resource.path,
        });

        // Individual Permission(DENY)이 Role 권한 + 소유자 권한보다 우선
        const afterPermission = await service.hasSpacePermission(
          owner.id,
          Action.UPDATE,
          space.id
        );
        expect(afterPermission).toBe(false);
      });

      it('권한 우선순위: Individual Permission > Visibility 확인', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PRIVATE Meeting 생성 (Visibility로 접근 차단)
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Private Meeting',
        });
        resource.visibility = ResourceVisibility.PRIVATE;
        await em.flush();

        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Visibility로 인해 접근 불가
        const beforePermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );
        expect(beforePermission).toBe(false);

        // Individual Permission이 Visibility보다 우선
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.READ,
          resourceSubject: ResourceSubject.MEETING,
          resourcePath: resource.path,
        });

        // Individual Permission으로 접근 가능
        const afterPermission = await service.hasMeetingPermission(
          member.id,
          Action.READ,
          meeting.id
        );
        expect(afterPermission).toBe(true);
      });
    });
  });

  describe('Various Actions (CREATE/UPDATE/DELETE/MANAGE)', () => {
    describe('CREATE 권한', () => {
      it('FULL_EDIT 역할은 Space CREATE 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const fullEditRole = await createRoleFixture(em, SystemRole.FULL_EDIT);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: fullEditRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        // PUBLIC Space 생성하여 visibility 통과
        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        // FULL_EDIT은 CREATE 권한 포함
        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.CREATE,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 역할은 Space CREATE 권한이 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.CREATE,
          space.id
        );

        expect(hasPermission).toBe(false);
      });

      it('Individual Permission으로 CREATE 권한을 부여받은 멤버는 생성할 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Individual Permission으로 CREATE 권한 부여
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.CREATE,
          resourceSubject: ResourceSubject.MEETING,
          resourcePath: resource.path,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.CREATE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });
    });

    describe('UPDATE 권한', () => {
      it('CAN_EDIT 역할은 Meeting UPDATE 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const canEditRole = await createRoleFixture(em, SystemRole.CAN_EDIT);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: canEditRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.UPDATE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 역할은 Space UPDATE 권한이 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.UPDATE,
          space.id
        );

        expect(hasPermission).toBe(false);
      });

      it('Individual Permission DENY는 Role UPDATE 권한을 무효화해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const fullEditRole = await createRoleFixture(em, SystemRole.FULL_EDIT);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: fullEditRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        // Individual Permission으로 UPDATE DENY
        await createDenyMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.UPDATE,
          resourceSubject: ResourceSubject.SPACE,
          resourcePath: resource.path,
        });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.UPDATE,
          space.id
        );

        expect(hasPermission).toBe(false);
      });
    });

    describe('DELETE 권한', () => {
      it('OWNER 역할은 Meeting DELETE 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const owner = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resourceOwner = await createWorkspaceMemberFixture(em, {
          workspace,
        });

        const resource = await createResourceFixture(em, {
          workspace,
          owner: resourceOwner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          owner.id,
          Action.DELETE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 역할은 Space DELETE 권한이 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.DELETE,
          space.id
        );

        expect(hasPermission).toBe(false);
      });

      it('Individual Permission으로 DELETE 권한을 부여받을 수 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const canEditRole = await createRoleFixture(em, SystemRole.CAN_EDIT);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: canEditRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Individual Permission으로 DELETE 권한 부여
        await createMemberResourcePermissionFixture(em, {
          workspaceMember: member,
          workspace,
          action: Action.DELETE,
          resourceSubject: ResourceSubject.MEETING,
          resourcePath: resource.path,
        });

        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.DELETE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });
    });

    describe('MANAGE 권한', () => {
      it('OWNER 역할은 Space MANAGE 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const owner = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resourceOwner = await createWorkspaceMemberFixture(em, {
          workspace,
        });

        const resource = await createResourceFixture(em, {
          workspace,
          owner: resourceOwner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        const hasPermission = await service.hasSpacePermission(
          owner.id,
          Action.MANAGE,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('ADMIN 역할은 Meeting MANAGE 권한이 있어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const adminRole = await createRoleFixture(em, SystemRole.ADMIN);
        const admin = await createWorkspaceMemberFixture(em, {
          workspace,
          role: adminRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        const hasPermission = await service.hasMeetingPermission(
          admin.id,
          Action.MANAGE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });

      it('CAN_VIEW 역할은 Space MANAGE 권한이 없어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        const viewRole = await createRoleFixture(em, SystemRole.CAN_VIEW);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: viewRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.MANAGE,
          space.id
        );

        expect(hasPermission).toBe(false);
      });
    });
  });

  describe('All Role Coverage (ADMIN/FULL_EDIT/CAN_EDIT)', () => {
    describe('ADMIN 역할', () => {
      it.each([
        [Action.MANAGE, 'Space', ResourceType.SPACE],
        [Action.CREATE, 'Meeting', ResourceType.MEETING],
        [Action.DELETE, 'Meeting', ResourceType.MEETING],
      ])(
        'ADMIN은 %s에 대한 %s 권한이 있어야 함',
        async (action, resourceTypeName, resourceType) => {
          const workspace = await createWorkspaceFixture(em);
          const adminRole = await createRoleFixture(em, SystemRole.ADMIN);
          const admin = await createWorkspaceMemberFixture(em, {
            workspace,
            role: adminRole,
          });
          const owner = await createWorkspaceMemberFixture(em, { workspace });

          const resource = await createResourceFixture(em, {
            workspace,
            owner,
            type: resourceType,
            title: `Admin Test ${resourceTypeName}`,
          });

          if (resourceType === ResourceType.SPACE) {
            const space = await createSpaceFixture(em, { workspace, resource });
            const hasPermission = await service.hasSpacePermission(
              admin.id,
              action,
              space.id
            );
            expect(hasPermission).toBe(true);
          } else {
            const meeting = await createMeetingFixture(em, {
              workspace,
              resource,
            });
            const hasPermission = await service.hasMeetingPermission(
              admin.id,
              action,
              meeting.id
            );
            expect(hasPermission).toBe(true);
          }
        }
      );
    });

    describe('FULL_EDIT 역할', () => {
      it.each([
        [Action.MANAGE, 'Space', ResourceType.SPACE],
        [Action.UPDATE, 'Meeting', ResourceType.MEETING],
        [Action.DELETE, 'Meeting', ResourceType.MEETING],
      ])(
        'FULL_EDIT은 %s에 대한 %s 권한이 있어야 함',
        async (action, resourceTypeName, resourceType) => {
          const workspace = await createWorkspaceFixture(em);
          const fullEditRole = await createRoleFixture(
            em,
            SystemRole.FULL_EDIT
          );
          const member = await createWorkspaceMemberFixture(em, {
            workspace,
            role: fullEditRole,
          });
          const owner = await createWorkspaceMemberFixture(em, { workspace });

          const resource = await createResourceFixture(em, {
            workspace,
            owner,
            type: resourceType,
            title: `FullEdit Test ${resourceTypeName}`,
          });

          if (resourceType === ResourceType.SPACE) {
            const space = await createSpaceFixture(em, { workspace, resource });
            const hasPermission = await service.hasSpacePermission(
              member.id,
              action,
              space.id
            );
            expect(hasPermission).toBe(true);
          } else {
            const meeting = await createMeetingFixture(em, {
              workspace,
              resource,
            });
            const hasPermission = await service.hasMeetingPermission(
              member.id,
              action,
              meeting.id
            );
            expect(hasPermission).toBe(true);
          }
        }
      );
    });

    describe('CAN_EDIT 역할', () => {
      it.each([
        [Action.CREATE, 'Space', ResourceType.SPACE, true],
        [Action.UPDATE, 'Meeting', ResourceType.MEETING, true],
        [Action.DELETE, 'Space', ResourceType.SPACE, true],
        [Action.MANAGE, 'Space', ResourceType.SPACE, false],
      ])(
        'CAN_EDIT은 %s에 대한 %s 권한이 %s해야 함',
        async (action, resourceTypeName, resourceType, expected) => {
          const workspace = await createWorkspaceFixture(em);
          const canEditRole = await createRoleFixture(em, SystemRole.CAN_EDIT);
          const member = await createWorkspaceMemberFixture(em, {
            workspace,
            role: canEditRole,
          });
          const owner = await createWorkspaceMemberFixture(em, { workspace });

          const resource = await createResourceFixture(em, {
            workspace,
            owner,
            type: resourceType,
            title: `CanEdit Test ${resourceTypeName}`,
          });

          if (resourceType === ResourceType.SPACE) {
            const space = await createSpaceFixture(em, { workspace, resource });
            const hasPermission = await service.hasSpacePermission(
              member.id,
              action,
              space.id
            );
            expect(hasPermission).toBe(expected);
          } else {
            const meeting = await createMeetingFixture(em, {
              workspace,
              resource,
            });
            const hasPermission = await service.hasMeetingPermission(
              member.id,
              action,
              meeting.id
            );
            expect(hasPermission).toBe(expected);
          }
        }
      );
    });
  });

  describe('Permission.covers() Logic Validation', () => {
    describe('MANAGE 권한 커버리지', () => {
      it('MANAGE 권한(FULL_EDIT)은 READ 권한을 포함해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        // FULL_EDIT role includes MANAGE permission
        const fullEditRole = await createRoleFixture(em, SystemRole.FULL_EDIT);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: fullEditRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        // Member with FULL_EDIT (MANAGE) should also have READ permission
        const hasReadPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasReadPermission).toBe(true);
      });

      it('MANAGE 권한(ADMIN)은 CREATE 권한을 포함해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        // ADMIN role includes MANAGE permission for Meeting
        const adminRole = await createRoleFixture(em, SystemRole.ADMIN);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: adminRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Member with ADMIN (MANAGE) should also have CREATE permission
        const hasCreatePermission = await service.hasMeetingPermission(
          member.id,
          Action.CREATE,
          meeting.id
        );

        expect(hasCreatePermission).toBe(true);
      });

      it('MANAGE 권한(OWNER)은 UPDATE 권한을 포함해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        // OWNER role includes MANAGE permission for all resources
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resourceOwner = await createWorkspaceMemberFixture(em, {
          workspace,
        });

        const resource = await createResourceFixture(em, {
          workspace,
          owner: resourceOwner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        // Member with OWNER (MANAGE) should also have UPDATE permission
        const hasUpdatePermission = await service.hasSpacePermission(
          member.id,
          Action.UPDATE,
          space.id
        );

        expect(hasUpdatePermission).toBe(true);
      });

      it('MANAGE 권한(FULL_EDIT)은 DELETE 권한을 포함해야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        // FULL_EDIT role includes MANAGE permission for Meeting
        const fullEditRole = await createRoleFixture(em, SystemRole.FULL_EDIT);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: fullEditRole,
        });
        const owner = await createWorkspaceMemberFixture(em, { workspace });

        const resource = await createResourceFixture(em, {
          workspace,
          owner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Member with FULL_EDIT (MANAGE) should also have DELETE permission
        const hasDeletePermission = await service.hasMeetingPermission(
          member.id,
          Action.DELETE,
          meeting.id
        );

        expect(hasDeletePermission).toBe(true);
      });
    });

    describe('ALL ResourceSubject 커버리지', () => {
      it('ResourceSubject.ALL 권한은 Space에 적용되어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        // OWNER role includes MANAGE permission for ResourceSubject.ALL
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resourceOwner = await createWorkspaceMemberFixture(em, {
          workspace,
        });

        const resource = await createResourceFixture(em, {
          workspace,
          owner: resourceOwner,
          type: ResourceType.SPACE,
          title: 'Test Space',
        });
        const space = await createSpaceFixture(em, { workspace, resource });

        // Member with OWNER (ResourceSubject.ALL) should have Space READ permission
        const hasPermission = await service.hasSpacePermission(
          member.id,
          Action.READ,
          space.id
        );

        expect(hasPermission).toBe(true);
      });

      it('ResourceSubject.ALL 권한은 Meeting에 적용되어야 함', async () => {
        const workspace = await createWorkspaceFixture(em);
        // OWNER role includes MANAGE permission for ResourceSubject.ALL
        const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
        const member = await createWorkspaceMemberFixture(em, {
          workspace,
          role: ownerRole,
        });
        const resourceOwner = await createWorkspaceMemberFixture(em, {
          workspace,
        });

        const resource = await createResourceFixture(em, {
          workspace,
          owner: resourceOwner,
          type: ResourceType.MEETING,
          title: 'Test Meeting',
        });
        const meeting = await createMeetingFixture(em, {
          workspace,
          resource,
        });

        // Member with OWNER (ResourceSubject.ALL) should have Meeting UPDATE permission
        const hasPermission = await service.hasMeetingPermission(
          member.id,
          Action.UPDATE,
          meeting.id
        );

        expect(hasPermission).toBe(true);
      });
    });
  });
});
