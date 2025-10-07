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

  beforeAll(async () => {
    /**
     * AuthGuard Mock: request.user 주입
     *
     * @description
     * JWT 토큰 검증을 건너뛰고 완전한 User 객체를 request.user에 주입합니다.
     */
    const mockUserPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      uid: 'test-uid-e2e-workspace-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test-workspace-e2e@example.com',
      passwordHash: 'hashed-password',
      isActive: true,
      settings: { theme: { mode: 'light' } },
    };

    /**
     * TestModuleBuilder로 E2E 테스트 환경 구성
     *
     * @description
     * - WorkspaceModule 로드
     * - AuthGuard mock (User 페이로드 주입)
     * - WorkspaceMemberGuard mock (단순 bypass)
     */
    const moduleFixture = await TestModuleBuilder.create()
      .withModule(WorkspaceModule)
      .mockGuard(AuthGuard, mockUserPayload)
      .mockGuard(WorkspaceMemberGuard) // ✅ 두 번째 인자 생략 시 단순 bypass
      .build();

    orm = moduleFixture.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;

    app = moduleFixture.createNestApplication();
    setupE2EEnhancers(app, moduleFixture);

    await app.init();
    await initializeTestDatabase(orm);
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await app.close();
    await orm.close();
  });

  describe('POST /workspace', () => {
    it('should create a new workspace', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspace')
        .send({ name: 'Test Workspace' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Workspace');
    });
  });
});
