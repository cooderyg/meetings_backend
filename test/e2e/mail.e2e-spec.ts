import { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { getQueueToken } from '@nestjs/bull';
import * as request from 'supertest';
import { TestModuleBuilder } from '../utils/test-module.builder';
import { setupE2EEnhancers } from '../utils/e2e-helpers';
import {
  initializeTestDatabase,
  cleanupTestDatabase,
} from '../utils/db-helpers';
import { MailModule } from '../../src/domain/mail/mail.module';
import { MailService } from '../../src/domain/mail/mail.service';
import { MailType } from '../../src/domain/mail/enum/mail-type.enum';
import { MailStatus } from '../../src/domain/mail/enum/mail-status.enum';
import { createUserFixture } from '../fixtures/user.fixture';
import { AuthGuard } from '../../src/shared/guard/auth.guard';

describe('Mail E2E Tests', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let mailService: MailService;

  /**
   * Mock Bull Queue
   *
   * @description
   * Bull Queue는 실제로 Redis와 연결되지 않고, 단순히 작업을 받아들이기만 합니다.
   * BullModule.registerQueueAsync()가 생성한 Queue provider를 Mock으로 대체합니다.
   *
   * @remarks
   * Bull Queue의 process() 메서드는 @Process() 데코레이터가 Processor를 등록할 때 사용됩니다.
   * E2E 테스트에서는 실제 작업 처리가 필요 없으므로 빈 함수로 Mock합니다.
   */
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
    process: jest.fn(), // ✅ Bull Explorer가 Processor를 등록하기 위해 필요
  };

  // Mock SES Client
  const mockSesClient = {
    send: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
  };

  beforeAll(async () => {
    // Mock user for AuthGuard
    const mockUserPayload = {
      id: 'test-user-id',
      uid: 'test-uid',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      passwordHash: 'hashed',
      isActive: true,
      settings: { theme: { mode: 'light' } },
    };

    const testModule = await TestModuleBuilder.create()
      .withModule(MailModule)
      .mockGuard(AuthGuard, mockUserPayload)
      .overrideProvider(getQueueToken('mail'))
      .useValue(mockQueue)
      .overrideProvider('SES_CLIENT')
      .useValue(mockSesClient)
      .build();

    orm = testModule.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;
    mailService = testModule.get<MailService>(MailService);

    app = testModule.createNestApplication();
    setupE2EEnhancers(app, testModule);
    await app.init();

    await initializeTestDatabase(orm);
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await app.close();
    await orm.close();
  }, 30000);

  describe('GET /mail-logs/:id', () => {
    it('메일 로그를 ID로 조회해야 함', async () => {
      const user = await createUserFixture(em);
      const mailLog = await mailService.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/mail-logs/${mailLog.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mailLog.id);
      expect(response.body).toHaveProperty('email', user.email);
      expect(response.body).toHaveProperty('type', MailType.WELCOME);
      expect(response.body).toHaveProperty('status', MailStatus.PENDING);
      expect(response.body.user).toHaveProperty('id', user.id);
    });

    it('존재하지 않는 메일 로그 조회 시 404를 반환해야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/mail-logs/${nonExistentId}`)
        .expect(404);
    });

    it('잘못된 UUID 형식에 대해 400을 반환해야 함', async () => {
      await request(app.getHttpServer())
        .get('/mail-logs/invalid-uuid')
        .expect(400);
    });
  });

  describe('GET /users/:userId/mail-logs', () => {
    it('사용자의 메일 이력을 조회해야 함', async () => {
      const user = await createUserFixture(em);

      // 3개의 메일 발송
      await mailService.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });
      await mailService.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });
      await mailService.sendInvitationMail({
        email: user.email,
        inviterName: 'John',
        workspaceName: 'Test Workspace',
        invitationToken: 'token-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isWorkspaceInvitation: true,
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}/mail-logs`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('email', user.email);
    });

    it('limit 쿼리 파라미터로 개수를 제한해야 함', async () => {
      const user = await createUserFixture(em);

      // 5개의 메일 발송
      for (let i = 0; i < 5; i++) {
        await mailService.sendWelcomeMail({
          email: user.email,
          name: user.firstName,
          userId: user.id,
        });
      }

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}/mail-logs?limit=2`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('메일 이력이 없는 사용자에 대해 빈 배열을 반환해야 함', async () => {
      const user = await createUserFixture(em);

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}/mail-logs`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('존재하지 않는 사용자 ID에 대해 빈 배열을 반환해야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}/mail-logs`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
