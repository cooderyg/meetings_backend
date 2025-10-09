import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { getQueueToken } from '@nestjs/bull';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { MailService } from './mail.service';
import { MailModule } from './mail.module';
import { MailStatus } from './enum/mail-status.enum';
import { MailType } from './enum/mail-type.enum';
import { createUserFixture } from '../../../test/fixtures/user.fixture';

describe('MailService Integration Tests', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: MailService;
  const containerKey = 'mail-service-integration';

  // Mock Bull Queue
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  // Mock SES Client
  const mockSesClient = {
    send: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
  };

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(MailModule)
      .withTestcontainer(containerKey)
      .overrideProvider(getQueueToken('mail'))
      .useValue(mockQueue)
      .overrideProvider('SES_CLIENT')
      .useValue(mockSesClient)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<MailService>(MailService);

    // ltree 확장 설치 (Resource 엔티티 사용 시)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    await orm.em.begin(); // ✅ 트랜잭션 시작
    mockQueue.add.mockClear(); // ✅ Mock 호출 기록 초기화
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

  describe('sendWelcomeMail', () => {
    it('환영 메일을 발송하고 로그를 생성해야 함', async () => {
      const user = await createUserFixture(em);

      const mailLog = await service.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });

      expect(mailLog).toBeDefined();
      expect(mailLog.type).toBe(MailType.WELCOME);
      expect(mailLog.status).toBe(MailStatus.PENDING);
      expect(mailLog.email).toBe(user.email);
      expect(mailLog.user?.id).toBe(user.id);
      expect(mailLog.subject).toContain('환영');

      // ✅ Queue에 작업 추가 검증
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith('send-mail', {
        mailLogId: mailLog.id,
        email: mailLog.email,
        type: MailType.WELCOME,
        subject: mailLog.subject,
        templateData: { name: user.firstName },
      });
    });

    it('userId 없이도 환영 메일을 발송할 수 있어야 함', async () => {
      const mailLog = await service.sendWelcomeMail({
        email: 'guest@example.com',
        name: 'Guest',
      });

      expect(mailLog).toBeDefined();
      expect(mailLog.type).toBe(MailType.WELCOME);
      expect(mailLog.email).toBe('guest@example.com');
      expect(mailLog.user).toBeUndefined();

      // ✅ Queue에 작업 추가 검증
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('잘못된 이메일 형식에 대해 에러를 던져야 함', async () => {
      await expect(
        service.sendWelcomeMail({
          email: 'invalid-email',
          name: 'Test',
        })
      ).rejects.toThrow();

      // ✅ 에러 시 Queue 호출 안됨
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('sendInvitationMail', () => {
    it('워크스페이스 초대 메일을 발송하고 로그를 생성해야 함', async () => {
      const user = await createUserFixture(em);

      const mailLog = await service.sendInvitationMail({
        email: user.email,
        inviterName: 'John Doe',
        workspaceName: 'My Workspace',
        invitationToken: 'test-token-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isWorkspaceInvitation: true,
        userId: user.id,
      });

      expect(mailLog).toBeDefined();
      expect(mailLog.type).toBe(MailType.INVITATION);
      expect(mailLog.status).toBe(MailStatus.PENDING);
      expect(mailLog.email).toBe(user.email);
      expect(mailLog.subject).toContain('초대');
      expect(mailLog.templateData.workspaceName).toBe('My Workspace');

      // ✅ Queue에 작업 추가 검증
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith('send-mail', expect.objectContaining({
        type: MailType.INVITATION,
        email: user.email,
      }));
    });

    it('스페이스 초대 메일을 발송하고 로그를 생성해야 함', async () => {
      const mailLog = await service.sendInvitationMail({
        email: 'invitee@example.com',
        inviterName: 'Jane Smith',
        workspaceName: 'Team Workspace',
        spaceName: 'Project A',
        invitationToken: 'space-token-456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isWorkspaceInvitation: false,
      });

      expect(mailLog).toBeDefined();
      expect(mailLog.type).toBe(MailType.INVITATION);
      expect(mailLog.templateData.spaceName).toBe('Project A');
      expect(mailLog.templateData.isWorkspaceInvitation).toBe(false);

      // ✅ Queue에 작업 추가 검증
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('만료된 초대 토큰에 대해 에러를 던져야 함', async () => {
      const pastDate = new Date(Date.now() - 1000);

      await expect(
        service.sendInvitationMail({
          email: 'test@example.com',
          inviterName: 'John',
          workspaceName: 'Test',
          invitationToken: 'expired-token',
          expiresAt: pastDate,
          isWorkspaceInvitation: true,
        })
      ).rejects.toThrow();

      // ✅ 에러 시 Queue 호출 안됨
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getMailLog', () => {
    it('메일 로그를 ID로 조회해야 함', async () => {
      const user = await createUserFixture(em);
      const created = await service.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });

      const found = await service.getMailLog(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(user.email);
    });

    it('존재하지 않는 ID 조회 시 에러를 던져야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(service.getMailLog(nonExistentId)).rejects.toThrow();
    });
  });

  describe('getUserMailHistory', () => {
    it('사용자의 메일 이력을 조회해야 함', async () => {
      const user = await createUserFixture(em);

      // 3개의 메일 발송
      await service.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });
      await service.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });
      await service.sendWelcomeMail({
        email: user.email,
        name: user.firstName,
        userId: user.id,
      });

      const history = await service.getUserMailHistory(user.id);

      expect(history).toHaveLength(3);
      expect(history[0].user?.id).toBe(user.id);
    });

    it('limit 파라미터로 개수를 제한해야 함', async () => {
      const user = await createUserFixture(em);

      // 5개의 메일 발송
      for (let i = 0; i < 5; i++) {
        await service.sendWelcomeMail({
          email: user.email,
          name: user.firstName,
          userId: user.id,
        });
      }

      const history = await service.getUserMailHistory(user.id, 2);

      expect(history).toHaveLength(2);
    });

    it('존재하지 않는 사용자 ID에 대해 빈 배열을 반환해야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const history = await service.getUserMailHistory(nonExistentId);

      expect(history).toEqual([]);
    });
  });
});
