import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthService } from './auth.service';
import { UserService } from '../../user/user.service';
import { WorkspaceService } from '../../workspace/workspace.service';
import { WorkspaceMemberService } from '../../workspace-member/workspace-member.service';
import { User } from '../../user/entity/user.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { OAuthType } from '../enums/oauth-type.enum';
import { AppError } from '../../../shared/exception/app.error';
import { TestModuleBuilder } from '../../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../../test/utils/testcontainer-singleton';
import { AuthModule } from '../auth.module';
import { AuthGuard } from '../../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../../shared/guard/workspace-member.guard';
import { createUserFixture } from '../../../../test/fixtures/user.fixture';

// Mock AppConfig
jest.mock('../../../shared/module/app-config/app-config', () => {
  return {
    AppConfig: jest.fn().mockImplementation(() => ({
      auth: {
        jwtSecret: 'testJwtSecret',
        jwtExpiresIn: '1h',
        refreshSecret: 'testRefreshSecret',
        refreshExpiresIn: '7d',
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'test_user',
        password: process.env.DB_PASSWORD || 'test_password',
        name: process.env.DB_NAME || 'test_db',
      },
    })),
  };
});

// Mock GoogleAuthStrategy
jest.mock('../strategies/google-auth.strategy', () => {
  return {
    GoogleAuthStrategy: jest.fn().mockImplementation(() => ({
      verifyOAuthToken: jest.fn(),
    })),
  };
});

describe('AuthService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: AuthService;
  const containerKey = 'auth-service-integration-test';

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    const module = await TestModuleBuilder.create()
      .withModule(AuthModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<AuthService>(AuthService);

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    // 각 테스트를 트랜잭션으로 격리
    await orm.em.begin();
  });

  afterEach(async () => {
    // 트랜잭션 롤백으로 데이터 초기화
    await orm.em.rollback();
    orm.em.clear();
    // 모든 mock 초기화
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // 정리 작업
    if (em) {
      await em.getConnection().close(true);
    }
    if (orm) {
      await orm.close();
    }
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('Google OAuth 로그인 시나리오', () => {
    it('기존 사용자가 Google OAuth로 로그인하는 시나리오', async () => {
      // Given
      await createUserFixture(em, {
        uid: 'google-uid-123',
        email: 'existing@google.com',
        firstName: '기존',
        lastName: '사용자',
      });

      const mockOAuthResult = {
        uid: 'google-uid-123',
        email: 'existing@google.com',
        firstName: '기존',
        lastName: '사용자',
      };

      const googleAuthStrategy = (service as any).strategies[OAuthType.GOOGLE];
      googleAuthStrategy.verifyOAuthToken = jest
        .fn()
        .mockResolvedValue(mockOAuthResult);

      // When
      const result = await service.signIn({
        code: 'google-auth-code',
        type: OAuthType.GOOGLE,
      });

      // Then
      // JWT 토큰이 실제로 생성되었는지 확인
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');

      // GoogleAuthStrategy가 호출되었는지 확인
      expect(googleAuthStrategy.verifyOAuthToken).toHaveBeenCalledWith({
        code: 'google-auth-code',
      });
    });

    // 새 사용자 생성 테스트는 워크스페이스 생성이 필요하므로 시스템 역할 시드 데이터 필요
    // 통합 테스트에서는 기존 사용자 로그인만 테스트하고, 새 사용자 생성은 E2E 테스트에서 처리
    it.skip('새 사용자가 Google OAuth로 로그인하고 워크스페이스가 생성되는 시나리오', async () => {
      // 이 테스트는 시스템 역할 시드 데이터가 필요하므로 skip
    });

    it('Google OAuth 토큰 검증 실패 시 에러를 발생시키는 시나리오', async () => {
      // Given
      const oauthError = new Error('Invalid OAuth token');

      // Mock GoogleAuthStrategy
      const googleAuthStrategy = (service as any).strategies[OAuthType.GOOGLE];
      googleAuthStrategy.verifyOAuthToken = jest
        .fn()
        .mockRejectedValue(oauthError);

      // When & Then
      await expect(
        service.signIn({
          code: 'invalid-google-code',
          type: OAuthType.GOOGLE,
        })
      ).rejects.toThrow(oauthError);
    });

    it('지원하지 않는 OAuth 타입으로 로그인 시 에러를 발생시키는 시나리오', async () => {
      // Given
      const invalidType = 'unsupported' as OAuthType;

      // When & Then
      await expect(
        service.signIn({
          code: 'some-code',
          type: invalidType,
        })
      ).rejects.toThrow(AppError);
    });
  });
});
