import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { InvitationService } from './invitation.service';
import { InvitationRepository } from './invitation.repository';
import { Invitation } from './entity/invitation.entity';
import { InvitationStatus } from './enum/invitation-status.enum';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { createUserFixture } from '../../../test/fixtures/user.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import { createRoleFixture } from '../../../test/fixtures/meeting.fixture';
import { SystemRole } from '../role/enum/system-role.enum';
import { InvitationModule } from './invitation.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { createInvitationFixture } from '../../../test/fixtures/invitation.fixture';

describe('InvitationService Integration Tests', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: InvitationService;
  let repository: InvitationRepository;
  let workspaceMemberService: WorkspaceMemberService;
  const containerKey = 'invitation-service-integration-test';

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(InvitationModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    service = module.get<InvitationService>(InvitationService);
    repository = module.get<InvitationRepository>(InvitationRepository);
    workspaceMemberService = module.get<WorkspaceMemberService>(
      WorkspaceMemberService
    );

    em = orm.em as EntityManager;

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

  describe('워크스페이스 초대 생성', () => {
    it('신규 이메일로 워크스페이스 초대를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const user = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      const inviteeEmail = 'newuser@example.com';

      // When
      const invitation = await service.createWorkspaceInvitation({
        workspaceId: workspace.id,
        inviterId: inviter.id,
        inviteeEmail,
        roleId: role.id,
      });

      // Then
      expect(invitation).toBeDefined();
      expect(invitation.workspace.id).toBe(workspace.id);
      expect(invitation.inviteeEmail).toBe(inviteeEmail);
      expect(invitation.role.id).toBe(role.id);
      expect(invitation.status).toBe(InvitationStatus.PENDING);
      expect(invitation.space).toBeNull();
      expect(invitation.token).toBeDefined();
      expect(invitation.expiresAt).toBeInstanceOf(Date);
    });

    it('초대 토큰이 고유해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const user = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      // When
      const invitation1 = await service.createWorkspaceInvitation({
        workspaceId: workspace.id,
        inviterId: inviter.id,
        inviteeEmail: 'user1@example.com',
        roleId: role.id,
      });

      const invitation2 = await service.createWorkspaceInvitation({
        workspaceId: workspace.id,
        inviterId: inviter.id,
        inviteeEmail: 'user2@example.com',
        roleId: role.id,
      });

      // Then
      expect(invitation1.token).not.toBe(invitation2.token);
    });

    it('만료 시간이 설정되어야 함 (기본 7일)', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const user = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      const now = new Date();

      // When
      const invitation = await service.createWorkspaceInvitation({
        workspaceId: workspace.id,
        inviterId: inviter.id,
        inviteeEmail: 'user@example.com',
        roleId: role.id,
      });

      // Then
      const expectedExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(
        invitation.expiresAt.getTime() - expectedExpiry.getTime()
      );
      expect(timeDiff).toBeLessThan(5000); // 5초 오차 허용
    });

    it('같은 이메일에 중복 PENDING 초대 시 에러를 던져야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const user = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user,
        workspace,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      });

      const inviteeEmail = 'duplicate@example.com';

      await service.createWorkspaceInvitation({
        workspaceId: workspace.id,
        inviterId: inviter.id,
        inviteeEmail,
        roleId: role.id,
      });

      // When & Then
      await expect(
        service.createWorkspaceInvitation({
          workspaceId: workspace.id,
          inviterId: inviter.id,
          inviteeEmail,
          roleId: role.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('워크스페이스 초대 수락', () => {
    it('초대 수락 시 WorkspaceMember를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const inviteeUser = await createUserFixture(em, {
        email: 'invitee@example.com',
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: inviteeUser.email,
        space: null,
      });

      // When
      const member = await service.acceptWorkspaceInvitation(
        invitation.token,
        inviteeUser.id
      );

      // Then
      expect(member).toBeDefined();
      expect(member.user.id).toBe(inviteeUser.id);
      expect(member.workspace.id).toBe(workspace.id);

      // 초대 상태 확인
      const updatedInvitation = await repository.findByToken(invitation.token);
      expect(updatedInvitation!.status).toBe(InvitationStatus.ACCEPTED);
    });

    it('만료된 초대는 수락 불가해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const inviteeUser = await createUserFixture(em, {
        email: 'invitee@example.com',
      });

      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1일 전

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: inviteeUser.email,
        expiresAt: expiredDate,
      });

      // When & Then
      await expect(
        service.acceptWorkspaceInvitation(invitation.token, inviteeUser.id)
      ).rejects.toThrow();
    });

    it('CANCELLED 상태 초대는 수락 불가해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const inviteeUser = await createUserFixture(em, {
        email: 'invitee@example.com',
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: inviteeUser.email,
        status: InvitationStatus.CANCELLED,
      });

      // When & Then
      await expect(
        service.acceptWorkspaceInvitation(invitation.token, inviteeUser.id)
      ).rejects.toThrow();
    });
  });

  describe.skip('스페이스 초대 생성 (TODO: SpaceMember 도메인 구현 후 활성화)', () => {
    it('워크스페이스 멤버가 아닌 사용자를 스페이스에 초대 시 워크스페이스 초대를 자동 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const space = await createSpaceFixture(em, { workspace });
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const inviteeEmail = 'newuser@example.com';

      // When
      const { workspaceInvitation, spaceInvitation } =
        await service.createSpaceInvitation({
          workspaceId: workspace.id,
          spaceId: space.id,
          inviterId: inviter.id,
          inviteeEmail,
          roleId: role.id,
        });

      // Then
      // 워크스페이스 초대 확인
      expect(workspaceInvitation).toBeDefined();
      expect(workspaceInvitation!.workspace.id).toBe(workspace.id);
      expect(workspaceInvitation!.space).toBeNull();
      expect(workspaceInvitation!.inviteeEmail).toBe(inviteeEmail);

      // 스페이스 초대 확인
      expect(spaceInvitation).toBeDefined();
      expect(spaceInvitation.workspace.id).toBe(workspace.id);
      expect(spaceInvitation.space!.id).toBe(space.id);
      expect(spaceInvitation.inviteeEmail).toBe(inviteeEmail);

      // 총 2개의 초대가 생성되었는지 확인
      const allInvitations = await repository.findPendingByEmail(inviteeEmail);
      expect(allInvitations).toHaveLength(2);
    });

    it('워크스페이스 멤버인 사용자를 스페이스에 초대 시 스페이스 초대만 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const space = await createSpaceFixture(em, { workspace });
      const inviterUser = await createUserFixture(em);
      const inviteeUser = await createUserFixture(em, {
        email: 'existing@example.com',
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);

      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      // 이미 워크스페이스 멤버인 사용자
      await workspaceMemberService.createWorkspaceMember({
        user: inviteeUser,
        workspace,
        role,
        firstName: inviteeUser.firstName,
        lastName: inviteeUser.lastName,
        isActive: true,
      });

      // When
      const { workspaceInvitation, spaceInvitation } =
        await service.createSpaceInvitation({
          workspaceId: workspace.id,
          spaceId: space.id,
          inviterId: inviter.id,
          inviteeEmail: inviteeUser.email,
          roleId: role.id,
        });

      // Then
      expect(workspaceInvitation).toBeNull();
      expect(spaceInvitation).toBeDefined();
      expect(spaceInvitation.space!.id).toBe(space.id);

      // 총 1개의 초대만 생성되었는지 확인
      const allInvitations = await repository.findPendingByEmail(
        inviteeUser.email
      );
      expect(allInvitations).toHaveLength(1);
    });
  });

  describe.skip('스페이스 초대 수락 (TODO: SpaceMember 도메인 구현 후 활성화)', () => {
    it('워크스페이스 멤버가 아니면 자동으로 추가하고 SpaceMember를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const space = await createSpaceFixture(em, { workspace });
      const inviterUser = await createUserFixture(em);
      const inviteeUser = await createUserFixture(em, {
        email: 'invitee@example.com',
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);

      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      // 워크스페이스 초대 생성
      const wsInvitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: inviteeUser.email,
        space: null,
      });

      // 스페이스 초대 생성
      const spaceInvitation = await createInvitationFixture(em, {
        workspace,
        space,
        inviter,
        role,
        inviteeEmail: inviteeUser.email,
      });

      // When
      const { workspaceMember, spaceMember } =
        await service.acceptSpaceInvitation(
          spaceInvitation.token,
          inviteeUser.id
        );

      // Then
      // 워크스페이스 멤버 확인
      expect(workspaceMember).toBeDefined();
      expect(workspaceMember.user.id).toBe(inviteeUser.id);
      expect(workspaceMember.workspace.id).toBe(workspace.id);

      // 스페이스 멤버 확인
      expect(spaceMember).toBeDefined();
      expect(spaceMember.workspaceMember.id).toBe(workspaceMember.id);
      expect(spaceMember.space.id).toBe(space.id);

      // 워크스페이스 초대 상태 확인
      const updatedWsInvitation = await repository.findByToken(
        wsInvitation.token
      );
      expect(updatedWsInvitation!.status).toBe(InvitationStatus.ACCEPTED);

      // 스페이스 초대 상태 확인
      const updatedSpaceInvitation = await repository.findByToken(
        spaceInvitation.token
      );
      expect(updatedSpaceInvitation!.status).toBe(InvitationStatus.ACCEPTED);
    });
  });

  describe('초대 조회', () => {
    it('이메일로 대기 중인 모든 초대를 조회해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const email = 'test@example.com';

      await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: email,
      });

      await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: email,
      });

      // When
      const invitations = await service.findPendingInvitationsByEmail(email);

      // Then
      expect(invitations).toHaveLength(2);
      expect(invitations.every((inv) => inv.inviteeEmail === email)).toBe(true);
      expect(
        invitations.every((inv) => inv.status === InvitationStatus.PENDING)
      ).toBe(true);
    });

    it('워크스페이스별 초대 목록을 조회해야 함', async () => {
      // Given
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);

      const inviter1 = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace: workspace1,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const inviter2 = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace: workspace2,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      await createInvitationFixture(em, {
        workspace: workspace1,
        inviter: inviter1,
        role,
        inviteeEmail: 'user1@example.com',
      });

      await createInvitationFixture(em, {
        workspace: workspace1,
        inviter: inviter1,
        role,
        inviteeEmail: 'user2@example.com',
      });

      await createInvitationFixture(em, {
        workspace: workspace2,
        inviter: inviter2,
        role,
        inviteeEmail: 'user3@example.com',
      });

      // When
      const workspace1Invitations = await repository.findByWorkspace(
        workspace1.id
      );

      // Then
      expect(workspace1Invitations).toHaveLength(2);
      expect(
        workspace1Invitations.every((inv) => inv.workspace.id === workspace1.id)
      ).toBe(true);
    });

    it('토큰으로 초대를 조회해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'test@example.com',
      });

      // When
      const found = await service.findInvitationByToken(invitation.token);

      // Then
      expect(found).toBeDefined();
      expect(found!.id).toBe(invitation.id);
      expect(found!.token).toBe(invitation.token);
    });
  });

  describe('초대 취소', () => {
    it('PENDING 상태 초대를 CANCELLED로 변경해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'test@example.com',
        status: InvitationStatus.PENDING,
      });

      // When
      await service.cancelInvitation(invitation.id, inviter.id);

      // Then
      const cancelled = await repository.findByToken(invitation.token);
      expect(cancelled!.status).toBe(InvitationStatus.CANCELLED);
    });

    it('이미 수락된 초대는 취소 불가해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const inviterUser = await createUserFixture(em);
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const inviter = await workspaceMemberService.createWorkspaceMember({
        user: inviterUser,
        workspace,
        role,
        firstName: inviterUser.firstName,
        lastName: inviterUser.lastName,
        isActive: true,
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'test@example.com',
        status: InvitationStatus.ACCEPTED,
      });

      // When & Then
      await expect(
        service.cancelInvitation(invitation.id, inviter.id)
      ).rejects.toThrow();
    });
  });
});

/**
 * 테스트용 Space 생성 헬퍼
 */
async function createSpaceFixture(
  em: EntityManager,
  overrides: any
): Promise<any> {
  const { Space } = await import('../space/entity/space.entity');
  const { Resource, ResourceType, ResourceVisibility } = await import(
    '../resource/entity/resource.entity'
  );

  const workspace = overrides.workspace;
  const user = await createUserFixture(em);
  const role = await createRoleFixture(em, SystemRole.OWNER);

  // WorkspaceMember 조회 또는 생성
  const { WorkspaceMember } = await import(
    '../workspace-member/entity/workspace-member.entity'
  );
  let owner = await em.getRepository(WorkspaceMember).findOne({
    workspace,
  });

  if (!owner) {
    const { WorkspaceMemberRole } = await import(
      '../workspace-member-role/entity/workspace-member-role.entity'
    );
    owner = new WorkspaceMember();
    owner.user = user;
    owner.workspace = workspace;
    owner.firstName = user.firstName;
    owner.lastName = user.lastName;
    owner.isActive = true;

    const wmRole = new WorkspaceMemberRole();
    wmRole.workspaceMember = owner;
    wmRole.role = role;

    await em.persistAndFlush([owner, wmRole]);
  }

  const resource = new Resource();
  resource.workspace = workspace;
  resource.owner = owner;
  resource.title = overrides.title ?? 'Test Space';
  resource.type = ResourceType.SPACE;
  resource.visibility = ResourceVisibility.PUBLIC;
  resource.path = 'root.test_space';

  const space = new Space();
  space.resource = resource;
  space.workspace = workspace;
  space.description = overrides.description ?? null;

  await em.persistAndFlush([resource, space]);
  return space;
}
