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
 * @description
 * MeetingController의 모든 HTTP 엔드포인트를 실제 HTTP 요청/응답으로 검증합니다.
 * - RESTful API 규약 준수 확인 (상태 코드, 응답 형식)
 * - DTO 검증 및 에러 핸들링
 * - 워크스페이스 권한 체크
 * - DRAFT 상태 미팅의 목록 조회 제외 규칙
 *
 * @remarks
 * **핵심 패턴: globalWorkspaceMemberId**
 * - E2E 테스트에서는 각 테스트마다 다른 워크스페이스를 생성합니다
 * - WorkspaceMemberGuard는 request.workspaceMemberId를 설정해야 합니다
 * - beforeEach가 아닌 각 테스트 내에서 동적으로 설정하기 위해 globalWorkspaceMemberId 사용
 *
 * @example
 * ```typescript
 * it('should create a new meeting', async () => {
 *   const workspace = await createWorkspaceFixture(em);
 *   const member = await createWorkspaceMemberFixture(em, { workspace, user: testUser });
 *   globalWorkspaceMemberId = member.id; // ✅ Guard mock이 이 값을 참조
 *
 *   await request(app.getHttpServer())
 *     .post(`/workspace/${workspace.id}/meetings`)
 *     .send({ parentPath: '/' })
 *     .expect(201);
 * });
 * ```
 *
 * @see {@link setupE2EEnhancers} - ValidationPipe, ExceptionFilter 설정
 * @see {@link TestModuleBuilder.mockGuard} - Guard 모킹 패턴
 */
describe('Meeting E2E', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let testUser: User;

  /**
   * 동적 WorkspaceMember ID 저장소
   *
   * @description
   * WorkspaceMemberGuard mock에서 참조할 수 있도록 전역 변수로 선언.
   * 각 테스트에서 workspace와 member를 생성한 후 이 변수에 member.id를 저장하면,
   * Guard mock의 canActivate()가 이 값을 request.workspaceMemberId에 주입합니다.
   *
   * @example
   * ```typescript
   * const member = await createWorkspaceMemberFixture(em, { workspace });
   * globalWorkspaceMemberId = member.id; // ✅ Guard가 이 값을 사용
   * ```
   */
  let globalWorkspaceMemberId: string;

  beforeAll(async () => {
    /**
     * AuthGuard Mock: request.user 주입
     *
     * @description
     * JWT 토큰 검증을 건너뛰고 request.user를 직접 주입합니다.
     * Entity와 일치하는 완전한 User 객체를 제공해야 합니다.
     */
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

    /**
     * WorkspaceMemberGuard Mock: 동적 workspaceMemberId 주입
     *
     * @description
     * 실제 Guard는 DB에서 WorkspaceMember를 조회하지만, 테스트에서는:
     * 1. URL params에서 workspaceId 추출
     * 2. globalWorkspaceMemberId 변수에서 memberId 주입
     * 3. request.workspaceId, request.workspaceMemberId 설정
     *
     * @remarks
     * globalWorkspaceMemberId는 각 테스트에서 생성한 member.id로 설정해야 합니다.
     */
    const mockWorkspaceMemberGuard = {
      canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        const workspaceId = request.params?.workspaceId;

        request.workspaceId = workspaceId;
        request.workspaceMemberId = globalWorkspaceMemberId; // ✅ 동적 주입
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

  /**
   * GET /workspace/:workspaceId/meetings - 미팅 목록 조회
   *
   * @remarks
   * **중요: DRAFT 상태 미팅은 목록에서 제외됩니다**
   * - MeetingRepository.findList()는 status != DRAFT 조건을 적용
   * - 테스트 데이터 생성 시 PUBLISHED 또는 IN_PROGRESS 상태 사용 필수
   */
  describe('GET /workspace/:workspaceId/meetings', () => {
    it('should return paginated meeting list', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, {
        workspace,
        user: testUser,
      });
      globalWorkspaceMemberId = member.id;

      // ✅ PUBLISHED 상태로 생성 (DRAFT는 목록에서 제외됨)
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
