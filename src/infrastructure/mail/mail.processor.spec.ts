import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailProcessor } from './mail.processor';
import { MailTemplateService } from './mail-template.service';
import { MailRepository } from '../../domain/mail/mail.repository';
import { MailStatus } from '../../domain/mail/enum/mail-status.enum';
import { MailType } from '../../domain/mail/enum/mail-type.enum';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

describe('MailProcessor Unit Tests', () => {
  let processor: MailProcessor;
  let templateService: jest.Mocked<MailTemplateService>;
  let mailRepository: jest.Mocked<MailRepository>;
  let sesClient: any; // SESClient Mock (send 메서드만 필요)

  const mockJob = {
    data: {
      mailLogId: 'test-mail-log-id',
      email: 'test@example.com',
      type: MailType.WELCOME,
      subject: 'Test Subject',
      templateData: { name: 'Test User' },
    },
  } as any;

  beforeEach(async () => {
    // Mock SESClient
    const mockSesClient = {
      send: jest.fn() as jest.MockedFunction<any>,
    };

    // Mock MailTemplateService
    const mockTemplateService = {
      compileTemplate: jest.fn(),
    };

    // Mock MailRepository
    const mockMailRepository = {
      updateStatus: jest.fn(),
      incrementRetryCount: jest.fn(),
      findById: jest.fn(),
    };

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          MAIL_FROM_EMAIL: 'noreply@test.com',
          MAIL_FROM_NAME: 'Test Mailer',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        {
          provide: MailTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: MailRepository,
          useValue: mockMailRepository,
        },
        {
          provide: 'SES_CLIENT',
          useValue: mockSesClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
    templateService = module.get(MailTemplateService);
    mailRepository = module.get(MailRepository);
    sesClient = module.get('SES_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSendMail', () => {
    it('메일을 성공적으로 발송하고 상태를 SENT로 업데이트해야 함', async () => {
      // Given
      const compiledHtml = '<html>Test Email</html>';
      const sesMessageId = 'ses-message-id-12345';

      templateService.compileTemplate.mockReturnValue(compiledHtml);
      sesClient.send.mockResolvedValue({ MessageId: sesMessageId } as any);

      // When
      await processor.handleSendMail(mockJob);

      // Then
      // 1. 템플릿 컴파일 확인
      expect(templateService.compileTemplate).toHaveBeenCalledWith(
        MailType.WELCOME,
        { name: 'Test User' }
      );

      // 2. SES SendEmailCommand 호출 확인
      expect(sesClient.send).toHaveBeenCalledTimes(1);
      const sendEmailCommand = sesClient.send.mock.calls[0][0];
      expect(sendEmailCommand).toBeInstanceOf(SendEmailCommand);
      expect(sendEmailCommand.input).toMatchObject({
        Source: '"Test Mailer" <noreply@test.com>',
        Destination: {
          ToAddresses: ['test@example.com'],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: 'Test Subject',
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: compiledHtml,
            },
          },
        },
      });

      // 3. MailLog 상태 업데이트 확인
      expect(mailRepository.updateStatus).toHaveBeenCalledWith(
        'test-mail-log-id',
        MailStatus.SENT,
        sesMessageId
      );
    });

    it('메일 발송 실패 시 재시도 횟수를 증가시켜야 함', async () => {
      // Given
      const compiledHtml = '<html>Test Email</html>';
      const error = new Error('SES send failed');

      templateService.compileTemplate.mockReturnValue(compiledHtml);
      sesClient.send.mockRejectedValue(error);
      mailRepository.findById.mockResolvedValue({
        id: 'test-mail-log-id',
        retryCount: 0,
      } as any);

      // When & Then
      await expect(processor.handleSendMail(mockJob)).rejects.toThrow(
        'SES send failed'
      );

      // 재시도 횟수 증가 확인
      expect(mailRepository.incrementRetryCount).toHaveBeenCalledWith(
        'test-mail-log-id',
        'SES send failed'
      );

      // 아직 최대 재시도 횟수 미달이므로 FAILED 상태로 변경되지 않아야 함
      expect(mailRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('재시도 횟수가 2회 이상일 때 상태를 FAILED로 업데이트해야 함', async () => {
      // Given
      const compiledHtml = '<html>Test Email</html>';
      const error = new Error('SES send failed');

      templateService.compileTemplate.mockReturnValue(compiledHtml);
      sesClient.send.mockRejectedValue(error);
      mailRepository.findById.mockResolvedValue({
        id: 'test-mail-log-id',
        retryCount: 2, // 3번째 시도 (0, 1, 2)
      } as any);

      // When & Then
      await expect(processor.handleSendMail(mockJob)).rejects.toThrow(
        'SES send failed'
      );

      // 재시도 횟수 증가 확인
      expect(mailRepository.incrementRetryCount).toHaveBeenCalledWith(
        'test-mail-log-id',
        'SES send failed'
      );

      // 최대 재시도 횟수 초과로 FAILED 상태로 변경
      expect(mailRepository.updateStatus).toHaveBeenCalledWith(
        'test-mail-log-id',
        MailStatus.FAILED
      );
    });

    it('템플릿 컴파일 실패 시 에러를 throw해야 함', async () => {
      // Given
      const error = new Error('Template compilation failed');
      templateService.compileTemplate.mockImplementation(() => {
        throw error;
      });
      mailRepository.findById.mockResolvedValue({
        id: 'test-mail-log-id',
        retryCount: 0,
      } as any);

      // When & Then
      await expect(processor.handleSendMail(mockJob)).rejects.toThrow(
        'Template compilation failed'
      );

      // 재시도 횟수 증가 확인
      expect(mailRepository.incrementRetryCount).toHaveBeenCalledWith(
        'test-mail-log-id',
        'Template compilation failed'
      );

      // SES는 호출되지 않아야 함
      expect(sesClient.send).not.toHaveBeenCalled();
    });

    it('Unknown error 처리를 올바르게 해야 함', async () => {
      // Given
      const compiledHtml = '<html>Test Email</html>';
      templateService.compileTemplate.mockReturnValue(compiledHtml);
      sesClient.send.mockRejectedValue('String error'); // Error 객체가 아닌 경우
      mailRepository.findById.mockResolvedValue({
        id: 'test-mail-log-id',
        retryCount: 0,
      } as any);

      // When & Then
      await expect(processor.handleSendMail(mockJob)).rejects.toBe(
        'String error'
      );

      // Unknown error로 처리되어야 함
      expect(mailRepository.incrementRetryCount).toHaveBeenCalledWith(
        'test-mail-log-id',
        'Unknown error'
      );
    });

    it('다양한 메일 타입(INVITATION)을 처리할 수 있어야 함', async () => {
      // Given
      const invitationJob = {
        data: {
          mailLogId: 'invitation-mail-log-id',
          email: 'invitee@example.com',
          type: MailType.INVITATION,
          subject: 'Invitation Subject',
          templateData: {
            inviterName: 'John',
            workspaceName: 'Test Workspace',
          },
        },
      } as any;

      const compiledHtml = '<html>Invitation Email</html>';
      const sesMessageId = 'ses-invitation-id';

      templateService.compileTemplate.mockReturnValue(compiledHtml);
      sesClient.send.mockResolvedValue({ MessageId: sesMessageId } as any);

      // When
      await processor.handleSendMail(invitationJob);

      // Then
      expect(templateService.compileTemplate).toHaveBeenCalledWith(
        MailType.INVITATION,
        {
          inviterName: 'John',
          workspaceName: 'Test Workspace',
        }
      );

      expect(mailRepository.updateStatus).toHaveBeenCalledWith(
        'invitation-mail-log-id',
        MailStatus.SENT,
        sesMessageId
      );
    });
  });
});
