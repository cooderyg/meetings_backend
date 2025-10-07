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
 * Workspace E2E 테스트 - TestModuleBuilder 사용
 */
describe('Workspace E2E', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;

  beforeAll(async () => {
    // 모킹용 User 페이로드 (필요한 모든 필드 포함)
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

    const moduleFixture = await TestModuleBuilder.create()
      .withModule(WorkspaceModule)
      .mockGuard(AuthGuard, mockUserPayload)
      .mockGuard(WorkspaceMemberGuard)
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
