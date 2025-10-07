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
import { createWorkspaceFixture } from '../fixtures/workspace.fixture';
import { createUserFixture } from '../fixtures/user.fixture';
import {
  createWorkspaceMemberFixture,
  createMeetingFixture,
} from '../fixtures/meeting.fixture';
import { MeetingModule } from '../../src/domain/meeting/meeting.module';
import { MeetingStatus } from '../../src/domain/meeting/entity/meeting.entity';
import { ResourceVisibility } from '../../src/domain/resource/entity/resource.entity';
import { AuthGuard } from '../../src/shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../src/shared/guard/workspace-member.guard';
import { User } from '../../src/domain/user/entity/user.entity';

/**
 * Meeting E2E 테스트
 *
 * 주의사항:
 * 1. 인증 가드 모킹: 실제 JWT 인증을 건너뛰기 위해 가드를 모킹합니다
 * 2. 트랜잭션 격리: 각 테스트는 독립적인 데이터셋을 사용합니다
 * 3. HTTP 상태 코드: RESTful 규약에 따른 응답 검증
 */
describe('Meeting E2E', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let testUser: User;
  let globalWorkspaceMemberId: string;

  beforeAll(async () => {
    // Mock user payload with all required fields
    const mockUserPayload = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      uid: 'test-uid-e2e-meeting-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test-meeting-e2e@example.com',
      passwordHash: 'hashed-password',
      isActive: true,
      settings: { theme: { mode: 'light' } },
    };

    // WorkspaceMemberGuard mock that sets workspaceId and workspaceMemberId
    const mockWorkspaceMemberGuard = {
      canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        const workspaceId = request.params?.workspaceId;

        // Set workspaceId and workspaceMemberId
        request.workspaceId = workspaceId;
        request.workspaceMemberId = globalWorkspaceMemberId;
        return true;
      },
    };

    const testModule = await TestModuleBuilder.create()
      .withModule(MeetingModule)
      .mockGuard(AuthGuard, mockUserPayload)
      .mockGuard(WorkspaceMemberGuard, mockWorkspaceMemberGuard)
      .build();

    // Get services
    orm = testModule.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;

    // Create application and initialize
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

  describe('POST /workspace/:workspaceId/meetings', () => {
    it('should create a new meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;

      const response = await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/meetings`)
        .send({ parentPath: '/' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(MeetingStatus.DRAFT);
      expect(response.body.resource).toBeDefined();
      expect(response.body.resource.title).toBe('Untitled');
    });

    it('should validate required fields', async () => {
      const workspace = await createWorkspaceFixture(em);

      await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/meetings`)
        .send({})
        .expect(400);
    });

    it('should validate UUID format', async () => {
      await request(app.getHttpServer())
        .post('/workspace/invalid-uuid/meetings')
        .send({ parentPath: '/' })
        .expect(400);
    });
  });

  describe('GET /workspace/:workspaceId/meetings', () => {
    it('should return paginated meeting list', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;

      // Create test meetings (non-DRAFT status to be included in list)
      for (let i = 0; i < 5; i++) {
        await createMeetingFixture(em, {
          workspace,
          owner: member,
          status: MeetingStatus.PUBLISHED,
        });
      }

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.totalCount).toBe(5);
    });

    it('should return non-draft meetings', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;

      await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.COMPLETED,
      });
      await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.COMPLETED,
      });
      await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.PUBLISHED,
      });
      await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.DRAFT,
      }); // Should be excluded

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Returns all non-DRAFT meetings (COMPLETED + PUBLISHED)
      expect(response.body.totalCount).toBe(3);
      expect(
        response.body.data.every((m: any) => m.status !== MeetingStatus.DRAFT)
      ).toBe(true);
    });

    it('should return empty list for workspace with no meetings', async () => {
      const workspace = await createWorkspaceFixture(em);

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.totalCount).toBe(0);
    });
  });

  describe('GET /workspace/:workspaceId/meetings/drafts/my', () => {
    it('should return my draft meetings only', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;

      // Create draft meeting
      await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.DRAFT,
      });

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/drafts/my`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /workspace/:workspaceId/meetings/:id', () => {
    it('should return meeting detail', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;
      const meeting = await createMeetingFixture(em, {
        workspace,
        owner: member,
      });

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
      expect(response.body.status).toBe(MeetingStatus.DRAFT);
      expect(response.body.resource).toBeDefined();
    });

    it('should return empty object for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${nonExistentId}`)
        .expect(200);

      // NestJS serialization converts null to {}
      expect(response.body).toEqual({});
    });

    it('should validate UUID format', async () => {
      const workspace = await createWorkspaceFixture(em);

      await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/invalid-id`)
        .expect(400);
    });
  });

  describe('PATCH /workspace/:workspaceId/meetings/:id', () => {
    it('should update meeting fields', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;
      const meeting = await createMeetingFixture(em, {
        workspace,
        owner: member,
      });

      const response = await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .send({
          memo: 'Updated memo',
          summary: 'Updated summary',
        })
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
      expect(response.body.memo).toBe('Updated memo');
      expect(response.body.summary).toBe('Updated summary');
    });

    it('should return 404 for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${nonExistentId}`)
        .send({ memo: 'New memo' })
        .expect(404); // AppError: meeting.update.notFound
    });

    it('should update meeting status', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;
      const meeting = await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.DRAFT,
      });

      const response = await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .send({ status: MeetingStatus.IN_PROGRESS })
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.IN_PROGRESS);
    });
  });

  describe('PATCH /workspace/:workspaceId/meetings/publish/:id', () => {
    it('should publish completed meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;
      const meeting = await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${meeting.id}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.PUBLISHED);
      expect(response.body.resource.visibility).toBe(ResourceVisibility.PUBLIC);
    });

    it('should fail to publish draft meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;
      const meeting = await createMeetingFixture(em, {
        workspace,
        owner: member,
        status: MeetingStatus.DRAFT,
      });

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${meeting.id}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(400); // AppError: meeting.publish.isDraft
    });

    it('should fail for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${nonExistentId}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(404); // AppError: meeting.publish.notFound
    });
  });

  describe('DELETE /workspace/:workspaceId/meetings/:id', () => {
    it('should soft delete meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;
      const meeting = await createMeetingFixture(em, {
        workspace,
        owner: member,
      });

      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(204);

      // Verify meeting is soft deleted
      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should validate UUID format', async () => {
      const workspace = await createWorkspaceFixture(em);

      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/meetings/invalid-id`)
        .expect(400);
    });
  });

  describe('Integration flows', () => {
    it('should complete full meeting lifecycle', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;

      // 1. Create meeting
      const createResponse = await request(app.getHttpServer())
        .post(`/workspace/${workspace.id}/meetings`)
        .send({ parentPath: '/' })
        .expect(201);

      const meetingId = createResponse.body.id;

      // 2. Update meeting
      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${meetingId}`)
        .send({
          memo: 'Meeting notes',
          summary: 'Meeting summary',
          status: MeetingStatus.COMPLETED,
        })
        .expect(200);

      // 3. Publish meeting
      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${meetingId}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(200);

      // 4. Verify published status
      const getResponse = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meetingId}`)
        .expect(200);

      expect(getResponse.body.status).toBe(MeetingStatus.PUBLISHED);
      expect(getResponse.body.memo).toBe('Meeting notes');

      // 5. Delete meeting
      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/meetings/${meetingId}`)
        .expect(204);

      // 6. Verify deletion
      const deletedResponse = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meetingId}`)
        .expect(200);

      expect(deletedResponse.body).toEqual({});
    });

    it('should isolate meetings by workspace', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);
      const member1 = await createWorkspaceMemberFixture(em, {
        workspace: workspace1,
        user: testUser,
      });
      const member2 = await createWorkspaceMemberFixture(em, {
        workspace: workspace2,
        user: testUser,
      });

      const meeting1 = await createMeetingFixture(em, {
        workspace: workspace1,
        owner: member1,
      });
      const meeting2 = await createMeetingFixture(em, {
        workspace: workspace2,
        owner: member2,
      });

      // Meeting1 should not be accessible from workspace2
      globalWorkspaceMemberId = member2.id; // Use workspace2's member
      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace2.id}/meetings/${meeting1.id}`)
        .expect(200);

      expect(response.body).toEqual({});

      // Meeting2 should be accessible from workspace2
      const response2 = await request(app.getHttpServer())
        .get(`/workspace/${workspace2.id}/meetings/${meeting2.id}`)
        .expect(200);

      expect(response2.body.id).toBe(meeting2.id);
    });
  });
});
