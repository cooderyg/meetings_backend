import { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import {
  initializeTestDatabase,
  cleanupTestDatabase,
} from '../utils/db-helpers';
import { TestModuleBuilder } from '../utils/test-module.builder';
import { setupE2EEnhancers } from '../utils/e2e-helpers';
import { WorkspaceModule } from '../../src/domain/workspace/workspace.module';
import { AuthGuard } from '../../src/shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../src/shared/guard/workspace-member.guard';
import { createUserFixture } from '../fixtures/user.fixture';
import { createWorkspaceFixture } from '../fixtures/workspace.fixture';
import { User } from '../../src/domain/user/entity/user.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';

/**
 * Workspace E2E 테스트
 *
 * @description
 * WorkspaceController의 HTTP 엔드포인트를 실제 요청/응답으로 검증합니다.
 * - 워크스페이스 생성 및 기본 설정 검증
 * - DTO 검증 및 RESTful 규약 확인
 *
 * @remarks
 * **Guard 모킹 패턴**
 * - AuthGuard: 완전한 User 페이로드로 request.user 주입
 * - WorkspaceMemberGuard: 단순 bypass (mockGuard 두 번째 인자 생략)
 *
 * @see {@link setupE2EEnhancers} - ValidationPipe, ExceptionFilter 설정
 * @see {@link TestModuleBuilder.mockGuard} - Guard 모킹 패턴
 */
describe('Workspace E2E', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let testUser: User;

  beforeAll(async () => {
    /**
     * 1단계: DB 및 ORM 초기화 (User 생성을 위해 먼저 필요)
     *
     * @description
     * tempModule은 User 생성용으로만 사용하며, Guard도 mock 처리해야 합니다.
     */
    const tempModule = await TestModuleBuilder.create()
      .withModule(WorkspaceModule)
      .mockGuard(AuthGuard) // ✅ 임시 모듈도 Guard mock 필요
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = tempModule.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;
    await initializeTestDatabase(orm);

    /**
     * 2단계: 실제 User 엔티티 생성 (AuthGuard가 참조할 User)
     */
    testUser = await createUserFixture(em, {
      uid: 'test-uid-e2e-workspace-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test-workspace-e2e@example.com',
    });

    await tempModule.close(); // 임시 모듈 정리

    /**
     * 3단계: AuthGuard Mock 설정 (실제 User 엔티티 주입)
     *
     * @description
     * JWT 토큰 검증을 건너뛰고 실제 User 엔티티를 request.user에 주입합니다.
     * MikroORM이 User를 다시 persist하지 않도록 실제 엔티티를 사용합니다.
     */
    const moduleFixture = await TestModuleBuilder.create()
      .withModule(WorkspaceModule)
      .mockGuard(AuthGuard, testUser) // ✅ 실제 User 엔티티 주입
      .mockGuard(WorkspaceMemberGuard) // ✅ 두 번째 인자 생략 시 단순 bypass
      .build();

    orm = moduleFixture.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;

    app = moduleFixture.createNestApplication();
    setupE2EEnhancers(app, moduleFixture);

    await app.init();
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await app.close();
    await orm.close();
  }, 30000);

  describe('POST /workspace', () => {
    it('새 workspace를 생성해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspace')
        .send({ name: 'Test Workspace' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Workspace');
    });

    it('필수 필드를 검증해야 함', async () => {
      await request(app.getHttpServer())
        .post('/workspace')
        .send({})
        .expect(400);
    });

    it('생성된 workspace는 FREE 티어여야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspace')
        .send({ name: 'Free Tier Workspace' })
        .expect(201);

      expect(response.body.subscriptionTier).toBe('free'); // ✅ Enum 값은 lowercase
    });

    it('사용자를 workspace 멤버로 자동 추가해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspace')
        .send({ name: 'Auto Member Workspace' })
        .expect(201);

      const workspaceId = response.body.id;

      // Verify user is added as workspace member
      const member = await em
        .getRepository(WorkspaceMember)
        .findOne({ workspace: workspaceId, user: testUser.id });

      expect(member).toBeDefined();
      expect(member!.isActive).toBe(true);
    });
  });

  describe('GET /workspace', () => {
    it('사용자의 workspace 목록을 반환해야 함', async () => {
      // Create multiple workspaces for the test user
      await createWorkspaceFixture(em, {
        name: 'Workspace 1',
      });
      await createWorkspaceFixture(em, {
        name: 'Workspace 2',
      });

      const response = await request(app.getHttpServer())
        .get('/workspace')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('빈 배열을 반환해야 함 (워크스페이스가 없는 경우)', async () => {
      // Create a new user with no workspaces
      const newUser = await createUserFixture(em, {
        uid: `no-workspace-uid-${Date.now()}`,
        email: `no-workspace-${Date.now()}@example.com`,
      });

      // Mock AuthGuard to use the new user
      const newUserPayload = {
        id: newUser.id,
        uid: newUser.uid,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        passwordHash: 'hashed',
        isActive: true,
        settings: { theme: { mode: 'light' } },
      };

      const newTestModule = await TestModuleBuilder.create()
        .withModule(WorkspaceModule)
        .mockGuard(AuthGuard, newUserPayload)
        .mockGuard(WorkspaceMemberGuard)
        .build();

      const newApp = newTestModule.createNestApplication();
      setupE2EEnhancers(newApp, newTestModule);
      await newApp.init();

      const response = await request(newApp.getHttpServer())
        .get('/workspace')
        .expect(200);

      expect(response.body).toEqual([]);

      await newApp.close();
    });
  });

  describe('PATCH /workspace/name/:id', () => {
    it('workspace 이름을 업데이트해야 함', async () => {
      // Create a workspace
      const workspace = await createWorkspaceFixture(em, {
        name: 'Original Name',
      });

      const response = await request(app.getHttpServer())
        .patch(`/workspace/name/${workspace.id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('존재하지 않는 workspace에 대해 404를 반환해야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/workspace/name/${nonExistentId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('필수 필드를 검증해야 함', async () => {
      const workspace = await createWorkspaceFixture(em, {
        name: 'Test Workspace',
      });

      await request(app.getHttpServer())
        .patch(`/workspace/name/${workspace.id}`)
        .send({})
        .expect(400);
    });

    it('UUID 형식을 검증해야 함', async () => {
      await request(app.getHttpServer())
        .patch('/workspace/name/invalid-uuid')
        .send({ name: 'New Name' })
        .expect(400);
    });

    it('이름이 실제로 업데이트되었는지 확인해야 함', async () => {
      // Create a workspace
      const workspace = await createWorkspaceFixture(em, {
        name: 'Before Update',
      });

      // Update the name
      await request(app.getHttpServer())
        .patch(`/workspace/name/${workspace.id}`)
        .send({ name: 'After Update' })
        .expect(200);

      // Clear EntityManager cache to fetch fresh data
      em.clear();

      // Verify the update in database
      const updatedWorkspace = await em
        .getRepository(Workspace)
        .findOne({ id: workspace.id });

      expect(updatedWorkspace!.name).toBe('After Update');
    });
  });

  describe('Integration flows', () => {
    it('전체 workspace 라이프사이클을 완료해야 함', async () => {
      // 1. Create workspace
      const createResponse = await request(app.getHttpServer())
        .post('/workspace')
        .send({ name: 'Lifecycle Workspace' })
        .expect(201);

      const workspaceId = createResponse.body.id;

      // 2. Get workspaces (should include newly created one)
      const getResponse = await request(app.getHttpServer())
        .get('/workspace')
        .expect(200);

      const workspaceIds = getResponse.body.map((w: any) => w.id);
      expect(workspaceIds).toContain(workspaceId);

      // 3. Update workspace name
      const updateResponse = await request(app.getHttpServer())
        .patch(`/workspace/name/${workspaceId}`)
        .send({ name: 'Updated Lifecycle Workspace' })
        .expect(200);

      expect(updateResponse.body.name).toBe('Updated Lifecycle Workspace');

      // 4. Get workspaces again to verify update
      const getResponse2 = await request(app.getHttpServer())
        .get('/workspace')
        .expect(200);

      const updatedWorkspace = getResponse2.body.find(
        (w: any) => w.id === workspaceId
      );
      expect(updatedWorkspace.name).toBe('Updated Lifecycle Workspace');
    });
  });
});
