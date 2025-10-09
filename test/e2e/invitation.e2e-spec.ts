import { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import { TestModuleBuilder } from '../utils/test-module.builder';
import { setupE2EEnhancers } from '../utils/e2e-helpers';
import {
  initializeTestDatabase,
  cleanupTestDatabase,
} from '../utils/db-helpers';
import { InvitationModule } from '../../src/domain/invitation/invitation.module';
import { AuthGuard } from '../../src/shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../src/shared/guard/workspace-member.guard';
import { InvitationStatus } from '../../src/domain/invitation/enum/invitation-status.enum';
import { createUserFixture } from '../fixtures/user.fixture';
import { createWorkspaceFixture } from '../fixtures/workspace.fixture';
import {
  createWorkspaceMemberFixture,
  createRoleFixture,
} from '../fixtures/meeting.fixture';
import { createInvitationFixture } from '../fixtures/invitation.fixture';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';
import { Invitation } from '../../src/domain/invitation/entity/invitation.entity';
import { User } from '../../src/domain/user/entity/user.entity';

describe('Invitation E2E', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let globalWorkspaceMemberId: string;
  let testUser: User;

  const mockUserPayload = {
    id: '123e4567-e89b-12d3-a456-426614174099',
    uid: 'test-uid-e2e-invitation-789',
    firstName: 'Test',
    lastName: 'User',
    email: 'test-invitation@example.com',
    passwordHash: 'hashed',
    isActive: true,
    settings: {
      theme: {
        mode: 'light' as const,
      },
    },
  };

  const mockWorkspaceMemberGuard = {
    canActivate: (context: any) => {
      const request = context.switchToHttp().getRequest();
      const workspaceId = request.params?.workspaceId;

      request.workspaceId = workspaceId;
      request.workspaceMemberId = globalWorkspaceMemberId;
      return true;
    },
  };

  beforeAll(async () => {
    const testModule = await TestModuleBuilder.create()
      .withModule(InvitationModule)
      .mockGuard(AuthGuard, mockUserPayload)
      .mockGuard(WorkspaceMemberGuard, mockWorkspaceMemberGuard)
      .build();

    orm = testModule.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;

    app = testModule.createNestApplication();
    setupE2EEnhancers(app, testModule);
    await app.init();

    await initializeTestDatabase(orm);

    // Create test user matching mockUserPayload
    testUser = await createUserFixture(em, {
      id: mockUserPayload.id,
      uid: mockUserPayload.uid,
      firstName: mockUserPayload.firstName,
      lastName: mockUserPayload.lastName,
      email: mockUserPayload.email,
    });
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await app.close();
    await orm.close();
  }, 30000);

  describe('POST /workspace/:workspaceId/invitations', () => {
    it('워크스페이스 초대를 생성해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_EDIT);
      globalWorkspaceMemberId = inviter.id;

      const response = await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/invitations`)
        .send({
          inviteeEmail: 'newuser@example.com',
          roleId: role.id,
          expirationDays: 7,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.inviteeEmail).toBe('newuser@example.com');
      expect(response.body.status).toBe(InvitationStatus.PENDING);
      expect(response.body.token).toBeDefined();
      expect(response.body.workspaceId).toBe(workspace.id);
      expect(response.body.spaceId).toBeNull();
    });

    it('중복된 pending 초대는 생성할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      globalWorkspaceMemberId = inviter.id;

      // 첫 번째 초대 생성
      await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'duplicate@example.com',
        status: InvitationStatus.PENDING,
      });

      // 동일한 이메일로 두 번째 초대 시도
      await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/invitations`)
        .send({
          inviteeEmail: 'duplicate@example.com',
          roleId: role.id,
        })
        .expect(400);
    });

    it('유효하지 않은 roleId로는 생성할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = inviter.id;

      await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/invitations`)
        .send({
          inviteeEmail: 'test@example.com',
          roleId: 99999, // 존재하지 않는 roleId
        })
        .expect(400);
    });

    it('expirationDays는 1~30일 사이여야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      globalWorkspaceMemberId = inviter.id;

      // 0일은 실패
      await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/invitations`)
        .send({
          inviteeEmail: 'test@example.com',
          roleId: role.id,
          expirationDays: 0,
        })
        .expect(400);

      // 31일은 실패
      await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/invitations`)
        .send({
          inviteeEmail: 'test2@example.com',
          roleId: role.id,
          expirationDays: 31,
        })
        .expect(400);
    });
  });

  describe('POST /invitations/accept/:token', () => {
    it('유효한 토큰으로 초대를 수락해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const accepter = await createUserFixture(em, {
        email: 'invitee@example.com',
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: accepter.email,
        status: InvitationStatus.PENDING,
      });

      // AuthGuard mock의 user.id를 일치시켜야 함
      mockUserPayload.id = accepter.id;
      mockUserPayload.email = accepter.email;

      const response = await request(app.getHttpServer())
        .post(`/invitations/accept/${invitation.token}`)
        .expect(201);

      expect(response.body).toHaveProperty('workspaceMemberId');
      expect(response.body).toHaveProperty('workspaceId');
      expect(response.body.workspaceId).toBe(workspace.id);
      expect(response.body.message).toBe('Invitation accepted successfully');
    });

    it('존재하지 않는 토큰은 수락할 수 없어야 함', async () => {
      await request(app.getHttpServer())
        .post('/invitations/accept/123e4567-e89b-12d3-a456-999999999999')
        .expect(404);
    });

    it('이메일이 일치하지 않으면 수락할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const wrongUser = await createUserFixture(em, {
        email: 'wronguser@example.com',
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'correctuser@example.com', // 다른 이메일
        status: InvitationStatus.PENDING,
      });

      mockUserPayload.id = wrongUser.id;
      mockUserPayload.email = wrongUser.email;

      await request(app.getHttpServer())
        .post(`/invitations/accept/${invitation.token}`)
        .expect(400);
    });

    it('만료된 초대는 수락할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const expiredUser = await createUserFixture(em, {
        email: 'expired@example.com',
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: expiredUser.email,
        status: InvitationStatus.PENDING,
        expiresAt: new Date('2020-01-01'), // 과거 날짜
      });

      mockUserPayload.id = expiredUser.id;
      mockUserPayload.email = expiredUser.email;

      await request(app.getHttpServer())
        .post(`/invitations/accept/${invitation.token}`)
        .expect(400);
    });
  });

  describe('GET /invitations/pending', () => {
    it('내 이메일로 온 pending 초대 목록을 조회해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const myEmail = 'myemail@example.com';

      const myUser = await createUserFixture(em, { email: myEmail });
      mockUserPayload.id = myUser.id;
      mockUserPayload.email = myEmail;

      // 내 이메일로 초대 생성
      await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: myEmail,
        status: InvitationStatus.PENDING,
      });

      // 다른 이메일로 초대 생성 (조회되지 않아야 함)
      await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'other@example.com',
        status: InvitationStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .get('/invitations/pending')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].inviteeEmail).toBe(myEmail);
    });

    it('ACCEPTED 상태 초대는 조회되지 않아야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const myEmail = 'accepted@example.com';

      const acceptedUser = await createUserFixture(em, { email: myEmail });
      mockUserPayload.id = acceptedUser.id;
      mockUserPayload.email = myEmail;

      // ACCEPTED 상태 초대 생성
      await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: myEmail,
        status: InvitationStatus.ACCEPTED,
      });

      const response = await request(app.getHttpServer())
        .get('/invitations/pending')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /invitations/:token', () => {
    it('토큰으로 초대 정보를 조회해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'lookup@example.com',
        status: InvitationStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .get(`/invitations/${invitation.token}`)
        .expect(200);

      expect(response.body.id).toBe(invitation.id);
      expect(response.body.inviteeEmail).toBe('lookup@example.com');
      expect(response.body.token).toBe(invitation.token);
    });

    it('존재하지 않는 토큰은 404를 반환해야 함', async () => {
      await request(app.getHttpServer())
        .get('/invitations/123e4567-e89b-12d3-a456-888888888888')
        .expect(404);
    });
  });

  describe('POST /invitations/:token/register', () => {
    it('미가입 사용자가 초대를 수락하며 회원가입해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const newUserEmail = 'newuser-register@example.com';

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: newUserEmail,
        status: InvitationStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/register`)
        .send({
          email: newUserEmail,
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('workspaceMember');
      expect(response.body.user.email).toBe(newUserEmail);
      expect(response.body.workspaceMember.workspaceId).toBe(workspace.id);

      // User 생성 확인
      const createdUser = await em.findOne(User, { email: newUserEmail });
      expect(createdUser).toBeDefined();
      expect(createdUser?.firstName).toBe('New');
      expect(createdUser?.lastName).toBe('User');

      // Invitation 상태 확인
      em.clear();
      const updatedInvitation = await em.findOne(Invitation, {
        id: invitation.id,
      });
      expect(updatedInvitation?.status).toBe(InvitationStatus.ACCEPTED);
    });

    it('이메일이 일치하지 않으면 회원가입할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'invited@example.com',
        status: InvitationStatus.PENDING,
      });

      await request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/register`)
        .send({
          email: 'different@example.com', // 다른 이메일
          password: 'Password123!',
          firstName: 'Wrong',
          lastName: 'User',
        })
        .expect(400);
    });

    it('이미 존재하는 이메일로는 회원가입할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      const existingUser = await createUserFixture(em, {
        email: 'existing@example.com',
      });

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: existingUser.email,
        status: InvitationStatus.PENDING,
      });

      await request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/register`)
        .send({
          email: existingUser.email,
          password: 'Password123!',
          firstName: 'Existing',
          lastName: 'User',
        })
        .expect(409);
    });

    it('만료된 초대로는 회원가입할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'expired-register@example.com',
        status: InvitationStatus.PENDING,
        expiresAt: new Date('2020-01-01'),
      });

      await request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/register`)
        .send({
          email: 'expired-register@example.com',
          password: 'Password123!',
          firstName: 'Expired',
          lastName: 'User',
        })
        .expect(400);
    });

    it('존재하지 않는 토큰으로는 회원가입할 수 없어야 함', async () => {
      await request(app.getHttpServer())
        .post('/invitations/123e4567-e89b-12d3-a456-999999999999/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(404);
    });
  });

  describe('DELETE /workspace/:workspaceId/invitations/:invitationId', () => {
    it('초대를 취소해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      globalWorkspaceMemberId = inviter.id;

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'cancel@example.com',
        status: InvitationStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/invitations/${invitation.id}`)
        .expect(200);

      expect(response.body.message).toBe('Invitation cancelled successfully');

      // 상태가 CANCELLED로 변경되었는지 확인
      em.clear();
      const updated = await em.findOne(Invitation, { id: invitation.id });
      expect(updated?.status).toBe(InvitationStatus.CANCELLED);
    });

    it('다른 사람이 생성한 초대는 취소할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const otherUser = await createUserFixture(em, {
        email: 'othermember@example.com',
      });
      const otherMember = await createWorkspaceMemberFixture(em, {
        workspace,
        user: otherUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      globalWorkspaceMemberId = otherMember.id; // 다른 멤버로 설정

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter, // inviter가 생성한 초대
        role,
        inviteeEmail: 'unauthorized@example.com',
        status: InvitationStatus.PENDING,
      });

      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/invitations/${invitation.id}`)
        .expect(403);
    });

    it('이미 ACCEPTED 상태인 초대는 취소할 수 없어야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const inviter = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      const role = await createRoleFixture(em, SystemRole.CAN_VIEW);
      globalWorkspaceMemberId = inviter.id;

      const invitation = await createInvitationFixture(em, {
        workspace,
        inviter,
        role,
        inviteeEmail: 'alreadyaccepted@example.com',
        status: InvitationStatus.ACCEPTED,
      });

      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/invitations/${invitation.id}`)
        .expect(400);
    });
  });
});
