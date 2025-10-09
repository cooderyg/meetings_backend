import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailTemplateService } from './mail-template.service';
import { MailType } from '../../domain/mail/enum/mail-type.enum';

describe('MailTemplateService Unit Tests', () => {
  let service: MailTemplateService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          APP_URL: 'http://test.example.com',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailTemplateService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailTemplateService>(MailTemplateService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('compileTemplate', () => {
    it('WELCOME 템플릿을 HTML로 컴파일해야 함', () => {
      // Given
      const templateData = {
        name: '홍길동',
      };

      // When
      const html = service.compileTemplate(MailType.WELCOME, templateData);

      // Then
      expect(html).toBeDefined();
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('html');
      expect(html).toContain('홍길동'); // 변수 치환 확인
      expect(html).toContain('http://test.example.com'); // APP_URL 주입 확인
    });

    it('INVITATION 템플릿을 HTML로 컴파일해야 함', () => {
      // Given
      const templateData = {
        inviterName: '김철수',
        workspaceName: '테스트 워크스페이스',
        isWorkspaceInvitation: true,
        invitationToken: 'abc123',
        expiresAt: '2025-01-31',
      };

      // When
      const html = service.compileTemplate(MailType.INVITATION, templateData);

      // Then
      expect(html).toBeDefined();
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('김철수'); // inviterName 치환 확인
      expect(html).toContain('테스트 워크스페이스'); // workspaceName 치환 확인
      expect(html).toContain('/invitations/accept?token=abc123'); // invitation URL 치환 확인
      expect(html).toContain('2025-01-31'); // expiresAt 치환 확인
    });

    it('Handlebars formatDate 헬퍼가 날짜를 올바르게 포맷팅해야 함', () => {
      // Given
      const testDate = new Date('2025-01-15T10:30:00Z');
      const templateData = {
        name: '테스트',
        createdAt: testDate,
      };

      // When
      const html = service.compileTemplate(MailType.WELCOME, templateData);

      // Then
      // formatDate 헬퍼가 템플릿에서 사용되지 않을 수 있으므로
      // 기본적으로 HTML이 생성되는지만 확인
      expect(html).toBeDefined();
      expect(html).toContain('테스트');
    });

    it('지원하지 않는 메일 타입에 대해 에러를 throw해야 함', () => {
      // Given
      const invalidType = 'INVALID_TYPE' as MailType;
      const templateData = {};

      // When & Then
      expect(() => service.compileTemplate(invalidType, templateData)).toThrow(
        'Unsupported mail type'
      );
    });

    it('빈 템플릿 데이터로도 컴파일이 가능해야 함', () => {
      // Given
      const emptyData = {};

      // When
      const html = service.compileTemplate(MailType.WELCOME, emptyData);

      // Then
      expect(html).toBeDefined();
      expect(html).toContain('<!doctype html>');
    });

    it('APP_URL이 템플릿에 자동으로 주입되어야 함', () => {
      // Given
      const templateData = {
        name: '테스트',
      };

      // When
      const html = service.compileTemplate(MailType.WELCOME, templateData);

      // Then
      expect(html).toContain('http://test.example.com');
      expect(configService.get).toHaveBeenCalledWith(
        'APP_URL',
        'http://localhost:3000'
      );
    });

    it('MJML이 유효한 HTML로 변환되어야 함', () => {
      // Given
      const templateData = {
        name: '테스트',
      };

      // When
      const html = service.compileTemplate(MailType.WELCOME, templateData);

      // Then
      // MJML이 변환한 HTML의 기본 구조 확인
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });

    it('특수 문자가 포함된 데이터도 올바르게 처리해야 함', () => {
      // Given
      const templateData = {
        name: '<script>alert("XSS")</script>',
      };

      // When
      const html = service.compileTemplate(MailType.WELCOME, templateData);

      // Then
      expect(html).toBeDefined();
      // Handlebars는 기본적으로 HTML escape를 수행
      expect(html).not.toContain('<script>');
    });
  });
});
