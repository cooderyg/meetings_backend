import { TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { getQueueToken } from '@nestjs/bull';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { MailRepository } from './mail.repository';
import { MailLog } from './entity/mail-log.entity';
import { MailType } from './enum/mail-type.enum';
import { MailStatus } from './enum/mail-status.enum';
import { createUserFixture } from '../../../test/fixtures/user.fixture';
import { MailModule } from './mail.module';

describe('MailRepository Integration Tests', () => {
  let module: TestingModule;
  let orm: MikroORM;
  let em: EntityManager;
  let repository: MailRepository;
  const containerKey = 'mail-repository-integration';

  // Mock Bull Queue
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  // Mock SES Client
  const mockSesClient = {
    send: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
  };

  beforeAll(async () => {
    module = await TestModuleBuilder.create()
      .withModule(MailModule)
      .withTestcontainer(containerKey)
      .overrideProvider(getQueueToken('mail'))
      .useValue(mockQueue)
      .overrideProvider('SES_CLIENT')
      .useValue(mockSesClient)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    repository = module.get<MailRepository>(MailRepository);

    // ltree 확장 설치 (Resource 엔티티 사용 시)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    await orm.em.begin(); // ✅ 트랜잭션 시작
  });

  afterEach(async () => {
    await orm.em.rollback(); // ✅ 트랜잭션 롤백 (데이터 자동 정리)
    orm.em.clear();
  });

  afterAll(async () => {
    if (em) await em.getConnection().close(true);
    if (orm) await orm.close();

    // Testcontainer 정리
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('create', () => {
    it('메일 로그를 생성하고 DB에 저장해야 함', async () => {
      const user = await createUserFixture(em);

      const mailLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: { name: user.firstName },
        status: MailStatus.PENDING,
      });

      expect(mailLog).toBeDefined();
      expect(mailLog.id).toBeDefined();
      expect(mailLog.email).toBe(user.email);
      expect(mailLog.type).toBe(MailType.WELCOME);
      expect(mailLog.status).toBe(MailStatus.PENDING);

      // DB에 실제로 저장되었는지 확인
      const found = await em.findOne(MailLog, { id: mailLog.id });
      expect(found).toBeDefined();
      expect(found?.email).toBe(user.email);
    });
  });

  describe('findById', () => {
    it('존재하는 메일 로그를 ID로 조회해야 함', async () => {
      const user = await createUserFixture(em);
      const created = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: { name: user.firstName },
        status: MailStatus.PENDING,
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(user.email);
    });

    it('존재하지 않는 ID 조회 시 null을 반환해야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const found = await repository.findById(nonExistentId);

      expect(found).toBeNull();
    });
  });

  describe('findUserHistory', () => {
    it('사용자의 메일 이력을 최신순으로 조회해야 함', async () => {
      const user = await createUserFixture(em);

      // 3개의 메일 로그 생성
      await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: { name: user.firstName },
        status: MailStatus.SENT,
      });

      await new Promise((resolve) => setTimeout(resolve, 10)); // createdAt 차이를 위해

      await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.INVITATION,
        subject: '초대합니다',
        templateData: { workspaceName: 'Test' },
        status: MailStatus.SENT,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const latest = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: { name: user.firstName },
        status: MailStatus.PENDING,
      });

      const history = await repository.findUserHistory(user.id, 10);

      expect(history).toHaveLength(3);
      expect(history[0].id).toBe(latest.id); // 최신순 (가장 마지막에 생성)
    });

    it('limit 파라미터로 개수를 제한해야 함', async () => {
      const user = await createUserFixture(em);

      // 10개의 메일 로그 생성
      for (let i = 0; i < 10; i++) {
        await repository.create({
          userId: user.id,
          email: user.email,
          type: MailType.WELCOME,
          subject: `메일 ${i}`,
          templateData: {},
          status: MailStatus.SENT,
        });
      }

      const history = await repository.findUserHistory(user.id, 5);

      expect(history).toHaveLength(5);
    });
  });

  describe('updateStatus', () => {
    it('메일 상태를 SENT로 업데이트하고 sentAt을 기록해야 함', async () => {
      const user = await createUserFixture(em);
      const mailLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: {},
        status: MailStatus.PENDING,
      });

      await repository.updateStatus(
        mailLog.id,
        MailStatus.SENT,
        'ses-message-id-123'
      );

      const updated = await em.findOne(MailLog, { id: mailLog.id });
      expect(updated?.status).toBe(MailStatus.SENT);
      expect(updated?.sentAt).toBeDefined();
      expect(updated?.sesMessageId).toBe('ses-message-id-123');
    });

    it('메일 상태를 FAILED로 업데이트해야 함', async () => {
      const user = await createUserFixture(em);
      const mailLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: {},
        status: MailStatus.PENDING,
      });

      await repository.updateStatus(mailLog.id, MailStatus.FAILED);

      const updated = await em.findOne(MailLog, { id: mailLog.id });
      expect(updated?.status).toBe(MailStatus.FAILED);
    });
  });

  describe('incrementRetryCount', () => {
    it('재시도 횟수를 증가시키고 에러 메시지를 저장해야 함', async () => {
      const user = await createUserFixture(em);
      const mailLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: {},
        status: MailStatus.PENDING,
      });

      await repository.incrementRetryCount(mailLog.id, 'Connection timeout');

      const updated = await em.findOne(MailLog, { id: mailLog.id });
      expect(updated?.retryCount).toBe(1);
      expect(updated?.errorMessage).toBe('Connection timeout');
      expect(updated?.status).toBe(MailStatus.FAILED);
    });
  });

  describe('deleteOldSentLogs', () => {
    it('1년 이상 된 SENT 상태 로그를 삭제해야 함', async () => {
      const user = await createUserFixture(em);

      // 1년 이전 로그
      const oldLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: {},
        status: MailStatus.SENT,
      });
      oldLog.createdAt = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000); // 366일 전
      await em.flush();

      // 최근 로그
      const recentLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: {},
        status: MailStatus.SENT,
      });

      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const deletedCount = await repository.deleteOldSentLogs(oneYearAgo);

      expect(deletedCount).toBe(1);

      const oldLogFound = await em.findOne(MailLog, { id: oldLog.id });
      const recentLogFound = await em.findOne(MailLog, { id: recentLog.id });

      expect(oldLogFound).toBeNull();
      expect(recentLogFound).toBeDefined();
    });

    it('FAILED 상태 로그는 삭제하지 않아야 함', async () => {
      const user = await createUserFixture(em);

      const oldFailedLog = await repository.create({
        userId: user.id,
        email: user.email,
        type: MailType.WELCOME,
        subject: '환영합니다',
        templateData: {},
        status: MailStatus.FAILED,
      });
      oldFailedLog.createdAt = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000); // 366일 전
      await em.flush();

      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const deletedCount = await repository.deleteOldSentLogs(oneYearAgo);

      expect(deletedCount).toBe(0);

      const failedLogFound = await em.findOne(MailLog, { id: oldFailedLog.id });
      expect(failedLogFound).toBeDefined();
    });
  });
});
