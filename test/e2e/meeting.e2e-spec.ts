import { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import { TestModuleBuilder } from '../utils/test-module.builder';
import { initializeTestDatabase, cleanupTestDatabase } from '../utils/db-helpers';
import { createWorkspaceFixture } from '../fixtures/workspace.fixture';
import {
  createWorkspaceMemberFixture,
  createMeetingFixture,
} from '../fixtures/meeting.fixture';
import { MeetingModule } from '../../src/domain/meeting/meeting.module';
import { MeetingStatus } from '../../src/domain/meeting/entity/meeting.entity';
import { ResourceVisibility } from '../../src/domain/resource/entity/resource.entity';
import { AuthGuard } from '../../src/shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../src/shared/guard/workspace-member.guard';

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

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(MeetingModule)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    // Get services
    orm = module.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;

    // Create application and initialize
    app = module.createNestApplication();
    await app.init();

    await initializeTestDatabase(orm);
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await app.close();
    await orm.close();
  }, 30000);

  describe('POST /workspace/:workspaceId/meetings', () => {
    it('should create a new meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

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

      // Create test meetings
      for (let i = 0; i < 5; i++) {
        await createMeetingFixture(em, { workspace });
      }

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.totalCount).toBe(5);
    });

    it('should filter meetings by status', async () => {
      const workspace = await createWorkspaceFixture(em);

      await createMeetingFixture(em, { workspace, status: MeetingStatus.DRAFT });
      await createMeetingFixture(em, { workspace, status: MeetingStatus.DRAFT });
      await createMeetingFixture(em, { workspace, status: MeetingStatus.PUBLISHED });

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 10, 'filters[status]': MeetingStatus.DRAFT })
        .expect(200);

      expect(response.body.totalCount).toBe(2);
      expect(response.body.data.every((m: any) => m.status === MeetingStatus.DRAFT)).toBe(
        true
      );
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
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // Create draft meeting
      await createMeetingFixture(em, {
        workspace,
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
      const meeting = await createMeetingFixture(em, { workspace });

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
      expect(response.body.status).toBe(MeetingStatus.DRAFT);
      expect(response.body.resource).toBeDefined();
    });

    it('should return null for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${nonExistentId}`)
        .expect(200);

      expect(response.body).toBeNull();
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
      const meeting = await createMeetingFixture(em, { workspace });

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

    it('should return 500 for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${nonExistentId}`)
        .send({ memo: 'New memo' })
        .expect(500); // AppError handling converts to 500
    });

    it('should update meeting status', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, {
        workspace,
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
      const meeting = await createMeetingFixture(em, {
        workspace,
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
      const meeting = await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.DRAFT,
      });

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${meeting.id}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(500); // AppError: meeting.publish.isDraft
    });

    it('should fail for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${nonExistentId}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(500); // AppError: meeting.publish.notFound
    });
  });

  describe('DELETE /workspace/:workspaceId/meetings/:id', () => {
    it('should soft delete meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(204);

      // Verify meeting is soft deleted
      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body).toBeNull();
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
      const member = await createWorkspaceMemberFixture(em, { workspace });

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

      expect(deletedResponse.body).toBeNull();
    });

    it('should isolate meetings by workspace', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);

      const meeting1 = await createMeetingFixture(em, { workspace: workspace1 });
      const meeting2 = await createMeetingFixture(em, { workspace: workspace2 });

      // Meeting1 should not be accessible from workspace2
      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace2.id}/meetings/${meeting1.id}`)
        .expect(200);

      expect(response.body).toBeNull();

      // Meeting2 should be accessible from workspace2
      const response2 = await request(app.getHttpServer())
        .get(`/workspace/${workspace2.id}/meetings/${meeting2.id}`)
        .expect(200);

      expect(response2.body.id).toBe(meeting2.id);
    });
  });
});
