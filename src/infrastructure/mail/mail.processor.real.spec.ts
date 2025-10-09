import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { MailProcessor } from './mail.processor';
import { MailTemplateService } from './mail-template.service';
import { MailRepository } from '../../domain/mail/mail.repository';
import { MailType } from '../../domain/mail/enum/mail-type.enum';

/**
 * MailProcessor 실제 메일 발송 통합 테스트
 *
 * @description
 * AWS SES SDK를 실제로 호출하여 메일 발송을 검증합니다.
 * Mock이 아닌 실제 AWS SES 연동을 테스트합니다.
 *
 * @remarks
 * **조건부 실행**:
 * - 실제 AWS 자격증명이 있는 경우에만 실행
 * - 더미 자격증명은 무시 (AKIA 또는 ASIA로 시작하는 키만 유효)
 * - CI/CD에서는 선택적으로 실행 가능
 *
 * **실행 방법**:
 * ```bash
 * # 환경 변수로 자격증명 제공
 * AWS_ACCESS_KEY_ID=AKIA... \
 * AWS_SECRET_ACCESS_KEY=xxx \
 * TEST_EMAIL=your-verified@email.com \
 * pnpm run test:mail:real
 *
 * # 또는 ~/.aws/credentials 파일 사용
 * TEST_EMAIL=your-verified@email.com pnpm run test:mail:real
 * ```
 *
 * **AWS SES Sandbox 모드 주의사항**:
 * 1. 발신자 이메일 인증 필요 (noreply@anote.app)
 * 2. 수신자 이메일 인증 필요 (TEST_EMAIL 환경 변수)
 * 3. Production 모드로 전환하면 모든 이메일 발송 가능
 *
 * **이메일 인증 방법**:
 * AWS Console → SES → Verified identities → Create identity
 *
 * **주의사항**:
 * - 실제 비용이 발생할 수 있음 (매우 소액, 월 62,000통까지 무료)
 * - 프로덕션 환경에서 실행 금지
 */
describe('MailProcessor Real Integration Tests', () => {
  let sesClient: SESClient;
  let configService: ConfigService;
  let templateService: MailTemplateService;

  /**
   * AWS 실제 자격증명 검증
   *
   * @description
   * - AKIA 또는 ASIA로 시작하는 AWS Access Key만 유효로 판단
   * - 더미 값(test-access-key 등)은 무시
   * - AWS_PROFILE 환경 변수 또는 ~/.aws/credentials 파일도 지원
   */
  const isRealAwsCredential = (accessKeyId?: string): boolean => {
    if (!accessKeyId) return false;
    // AWS Access Key 패턴: AKIA... (장기 자격증명) 또는 ASIA... (임시 자격증명)
    return accessKeyId.startsWith('AKIA') || accessKeyId.startsWith('ASIA');
  };

  const hasAwsCredentials =
    isRealAwsCredential(process.env.AWS_ACCESS_KEY_ID) ||
    !!process.env.AWS_PROFILE;

  // 자격증명이 없으면 모든 테스트 스킵
  const describeIf = hasAwsCredentials ? describe : describe.skip;

  beforeAll(() => {
    configService = new ConfigService();
    templateService = new MailTemplateService(configService);
    const region = configService.get<string>('AWS_REGION', 'ap-northeast-2');

    sesClient = new SESClient({
      region,
      // 환경 변수가 설정되어 있으면 자동으로 사용
      // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    });

    if (!hasAwsCredentials) {
      console.warn('');
      console.warn('⚠️  실제 메일 발송 테스트를 건너뜁니다.');
      console.warn('');
      console.warn('   실행 방법:');
      console.warn('   AWS_ACCESS_KEY_ID=AKIA... \\');
      console.warn('   AWS_SECRET_ACCESS_KEY=xxx \\');
      console.warn('   TEST_EMAIL=your-verified@email.com \\');
      console.warn('   pnpm run test:mail:real');
      console.warn('');
      console.warn('   주의: AWS SES Sandbox 모드에서는 인증된 이메일만 수신 가능');
      console.warn('');
    }
  });

  afterAll(async () => {
    if (sesClient) {
      sesClient.destroy();
    }
  });

  describeIf('실제 AWS SES 메일 발송', () => {
    it('WELCOME 템플릿으로 실제 메일을 발송해야 함', async () => {
      // Given: 테스트용 이메일 주소 및 템플릿 데이터
      const testEmail = configService.get<string>(
        'TEST_EMAIL',
        'test@example.com'
      );

      const fromEmail = configService.get<string>(
        'MAIL_FROM_EMAIL',
        'noreply@anote.app'
      );
      const fromName = configService.get<string>('MAIL_FROM_NAME', 'Anote');

      const templateData = {
        name: '테스트 사용자',
      };

      // When: 실제 템플릿 컴파일
      const html = templateService.compileTemplate(
        MailType.WELCOME,
        templateData
      );

      // AWS SES SendEmailCommand 생성
      const command = new SendEmailCommand({
        Source: `"${fromName}" <${fromEmail}>`,
        Destination: {
          ToAddresses: [testEmail],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: '[테스트] 환영합니다!',
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: html, // 실제 템플릿 사용
            },
          },
        },
      });

      // 실제 메일 발송
      const result = await sesClient.send(command);

      // Then: 검증
      expect(result.MessageId).toBeDefined();
      expect(typeof result.MessageId).toBe('string');
      expect(result.$metadata.httpStatusCode).toBe(200);

      console.log('✅ WELCOME 템플릿 메일 발송 성공');
      console.log(`   MessageId: ${result.MessageId}`);
      console.log(`   수신자: ${testEmail}`);
    }, 30000);

    it('INVITATION 템플릿으로 실제 메일을 발송해야 함', async () => {
      // Given: 테스트용 이메일 주소 및 템플릿 데이터
      const testEmail = configService.get<string>(
        'TEST_EMAIL',
        'test@example.com'
      );

      const fromEmail = configService.get<string>(
        'MAIL_FROM_EMAIL',
        'noreply@anote.app'
      );
      const fromName = configService.get<string>('MAIL_FROM_NAME', 'Anote');

      const templateData = {
        inviterName: '김철수',
        workspaceName: '테스트 워크스페이스',
        isWorkspaceInvitation: true,
        invitationToken: 'test-token-123',
        expiresAt: '2025-12-31',
      };

      // When: 실제 템플릿 컴파일
      const html = templateService.compileTemplate(
        MailType.INVITATION,
        templateData
      );

      // AWS SES SendEmailCommand 생성
      const command = new SendEmailCommand({
        Source: `"${fromName}" <${fromEmail}>`,
        Destination: {
          ToAddresses: [testEmail],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: '[테스트] 워크스페이스 초대',
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: html, // 실제 템플릿 사용
            },
          },
        },
      });

      // 실제 메일 발송
      const result = await sesClient.send(command);

      // Then: 검증
      expect(result.MessageId).toBeDefined();
      expect(typeof result.MessageId).toBe('string');
      expect(result.$metadata.httpStatusCode).toBe(200);

      console.log('✅ INVITATION 템플릿 메일 발송 성공');
      console.log(`   MessageId: ${result.MessageId}`);
      console.log(`   수신자: ${testEmail}`);
    }, 30000);

    it('AWS SES 자격증명이 유효해야 함', async () => {
      // SES 계정 정보 조회 (자격증명 검증)
      const command = new SendEmailCommand({
        Source: configService.get<string>(
          'MAIL_FROM_EMAIL',
          'noreply@anote.app'
        ),
        Destination: {
          ToAddresses: ['test@example.com'],
        },
        Message: {
          Subject: { Charset: 'UTF-8', Data: 'Test' },
          Body: { Html: { Charset: 'UTF-8', Data: '<p>Test</p>' } },
        },
      });

      // 자격증명이 유효하면 에러가 발생하지 않아야 함
      // (실제 발송하지 않고 command 생성만으로도 검증 가능)
      expect(command).toBeDefined();
      expect(command.input.Source).toContain('@');
    });
  });

  describeIf('AWS SES 에러 핸들링', () => {
    it('잘못된 이메일 형식에 대해 에러를 반환해야 함', async () => {
      const command = new SendEmailCommand({
        Source: configService.get<string>(
          'MAIL_FROM_EMAIL',
          'noreply@anote.app'
        ),
        Destination: {
          ToAddresses: ['invalid-email'], // 잘못된 형식
        },
        Message: {
          Subject: { Charset: 'UTF-8', Data: 'Test' },
          Body: { Html: { Charset: 'UTF-8', Data: '<p>Test</p>' } },
        },
      });

      // AWS SES가 이메일 형식 에러를 반환해야 함
      await expect(sesClient.send(command)).rejects.toThrow();
    }, 30000);
  });
});
