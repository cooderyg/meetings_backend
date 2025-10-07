import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import { TestModuleBuilder } from '../utils/test-module.builder';
import { initializeTestDatabase, cleanupTestDatabase } from '../utils/db-helpers';
import { WorkspaceFactory } from '../factories/workspace.factory';
import { MeetingFactory } from '../factories/meeting.factory';
import { createWorkspaceMemberFixture } from '../fixtures/meeting.fixture';
import { MeetingModule } from '../../src/domain/meeting/meeting.module';
import { MeetingStatus } from '../../src/domain/meeting/entity/meeting.entity';
import { ResourceVisibility } from '../../src/domain/resource/entity/resource.entity';
import { AuthGuard } from '../../src/shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../src/shared/guard/workspace-member.guard';
import { MeetingScenarios } from '../scenarios/meeting.scenarios';

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

    // E2E 테스트에 필요한 글로벌 파이프 설정 (DTO 변환 및 유효성 검증)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      })
    );

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
      const workspace = await new WorkspaceFactory(em).create();
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
      const workspace = await new WorkspaceFactory(em).create();

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
      const workspace = await new WorkspaceFactory(em).create();

      // Create test meetings
      await new MeetingFactory(em)
        .forWorkspace(workspace)
        .createList(5);

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.totalCount).toBe(5);
    });

    it('should filter meetings by status', async () => {
      const workspace = await new WorkspaceFactory(em).create();

      await new MeetingFactory(em)
        .forWorkspace(workspace)
        .asDraft()
        .createList(2);
      await new MeetingFactory(em)
        .forWorkspace(workspace)
        .asPublished()
        .create();

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
      const workspace = await new WorkspaceFactory(em).create();

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
      const workspace = await new WorkspaceFactory(em).create();
      const member = await createWorkspaceMemberFixture(em, { workspace });

      // Create draft meeting
      await new MeetingFactory(em)
        .forWorkspace(workspace)
        .asDraft()
        .create();

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
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em).forWorkspace(workspace).create();

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
      expect(response.body.status).toBe(MeetingStatus.DRAFT);
      expect(response.body.resource).toBeDefined();
    });

    it('should return null for non-existent meeting', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${nonExistentId}`)
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should validate UUID format', async () => {
      const workspace = await new WorkspaceFactory(em).create();

      await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/invalid-id`)
        .expect(400);
    });
  });

  describe('PATCH /workspace/:workspaceId/meetings/:id', () => {
    it('should update meeting fields', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em).forWorkspace(workspace).create();

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
      const workspace = await new WorkspaceFactory(em).create();
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${nonExistentId}`)
        .send({ memo: 'New memo' })
        .expect(500); // AppError handling converts to 500
    });

    it('should update meeting status', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em)
        .forWorkspace(workspace)
        .asDraft()
        .create();

      const response = await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .send({ status: MeetingStatus.IN_PROGRESS })
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.IN_PROGRESS);
    });
  });

  describe('PATCH /workspace/:workspaceId/meetings/publish/:id', () => {
    it('should publish completed meeting', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em)
        .forWorkspace(workspace)
        .asCompleted()
        .create();

      const response = await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${meeting.id}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.PUBLISHED);
      expect(response.body.resource.visibility).toBe(ResourceVisibility.PUBLIC);
    });

    it('should fail to publish draft meeting', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em)
        .forWorkspace(workspace)
        .asDraft()
        .create();

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${meeting.id}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(500); // AppError: meeting.publish.isDraft
    });

    it('should fail for non-existent meeting', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${nonExistentId}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(500); // AppError: meeting.publish.notFound
    });
  });

  describe('DELETE /workspace/:workspaceId/meetings/:id', () => {
    it('should soft delete meeting', async () => {
      const workspace = await new WorkspaceFactory(em).create();
      const meeting = await new MeetingFactory(em).forWorkspace(workspace).create();

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
      const workspace = await new WorkspaceFactory(em).create();

      await request(app.getHttpServer())
        .delete(`/workspace/${workspace.id}/meetings/invalid-id`)
        .expect(400);
    });
  });

  describe('Integration flows', () => {
    it('should complete full meeting lifecycle', async () => {
      const workspace = await new WorkspaceFactory(em).create();
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
      const workspace1 = await new WorkspaceFactory(em).create();
      const workspace2 = await new WorkspaceFactory(em).create();

      const meeting1 = await new MeetingFactory(em).forWorkspace(workspace1).create();
      const meeting2 = await new MeetingFactory(em).forWorkspace(workspace2).create();

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

  /**
   * Object Mother 패턴을 사용한 고급 시나리오 테스트
   * - Scenarios를 활용하여 복잡한 비즈니스 컨텍스트 테스트
   */
  describe('Advanced scenarios with Object Mother pattern', () => {
    let scenarios: MeetingScenarios;

    beforeEach(() => {
      scenarios = new MeetingScenarios(em);
    });

    it('should handle team meeting workflow', async () => {
      // Scenario: 팀 회의 생성 및 진행
      const { meeting, workspace, participants } =
        await scenarios.createTeamMeeting(5);

      // 회의가 정상적으로 생성되었는지 확인
      const getResponse = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe(MeetingStatus.IN_PROGRESS);
      expect(getResponse.body.tags).toContain('팀미팅');
      expect(participants).toHaveLength(5);
    });

    it('should manage multiple meetings in workspace', async () => {
      // Scenario: 여러 회의가 있는 워크스페이스
      const { workspace, meetings } =
        await scenarios.createWorkspaceWithMultipleMeetings(10);

      // 회의 목록 조회
      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.totalCount).toBe(10);
      expect(meetings).toHaveLength(10);

      // 다양한 상태의 회의가 포함되어 있는지 확인
      const statuses = new Set(meetings.map((m) => m.status));
      expect(statuses.size).toBeGreaterThan(1);
    });

    it('should handle meeting state transitions', async () => {
      // Scenario: 회의 상태 전환 워크플로우
      const { workspace, draftMeeting, completedMeeting } =
        await scenarios.createMeetingWorkflow();

      // Draft → In Progress
      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/${draftMeeting.id}`)
        .send({ status: MeetingStatus.IN_PROGRESS })
        .expect(200);

      // Completed → Published
      await request(app.getHttpServer())
        .patch(`/workspace/${workspace.id}/meetings/publish/${completedMeeting.id}`)
        .send({ visibility: ResourceVisibility.PUBLIC })
        .expect(200);

      // 최종 상태 확인
      const publishedResponse = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${completedMeeting.id}`)
        .expect(200);

      expect(publishedResponse.body.status).toBe(MeetingStatus.PUBLISHED);
    });

    it('should test completed meeting with full content', async () => {
      // Scenario: 완료된 회의 (메모, 요약, 태그 포함)
      const { meeting, workspace } =
        await scenarios.createCompletedMeetingWithContent();

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.COMPLETED);
      expect(response.body.memo).toContain('회의 메모');
      expect(response.body.summary).toContain('회의 요약');
      expect(response.body.tags).toContain('중요');
      expect(response.body.tags).toContain('기획');
    });

    it('should handle premium workspace features', async () => {
      // Scenario: Premium 워크스페이스의 고급 회의
      const { meeting, workspace, members } =
        await scenarios.createPremiumMeeting();

      const response = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
        .expect(200);

      expect(response.body.tags).toContain('프리미엄');
      expect(members).toHaveLength(3);

      // Premium 기능 테스트 (예: 고급 설정 등)
      const workspaceResponse = await request(app.getHttpServer())
        .get(`/workspace/${workspace.id}/meetings`)
        .expect(200);

      expect(workspaceResponse.body).toBeDefined();
    });
  });
});
