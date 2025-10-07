import { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import * as request from 'supertest';
import { TestModuleBuilder } from '../utils/test-module.builder';
import { setupE2EEnhancers } from '../utils/e2e-helpers';
import {
  initializeTestDatabase,
  cleanupTestDatabase,
} from '../utils/db-helpers';
import { AuthModule } from '../../src/domain/auth/auth.module';
import { OAuthType } from '../../src/domain/auth/enums/oauth-type.enum';
import { AuthService } from '../../src/domain/auth/services/auth.service';
import { AuthGuard } from '../../src/shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../src/shared/guard/workspace-member.guard';
import { createUserFixture } from '../fixtures/user.fixture';
import { User } from '../../src/domain/user/entity/user.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';

/**
 * Auth E2E 테스트
 *
 * @description
 * AuthController의 HTTP 엔드포인트를 실제 HTTP 요청/응답으로 검증합니다.
 * - OAuth 인증 (Google)
 * - JWT 토큰 발급
 * - 신규 사용자 회원가입
 * - 기존 사용자 로그인
 *
 * @remarks
 * **핵심 패턴: OAuth Strategy Mock**
 * - GoogleAuthStrategy.verifyOAuthToken()을 Mock하여 외부 OAuth 서비스 의존성 제거
 * - 실제 Google OAuth 서버 호출 없이 인증 로직 테스트
 * - JWT 토큰 발급 및 사용자 생성 플로우 검증
 *
 * @see {@link setupE2EEnhancers} - ValidationPipe, ExceptionFilter 설정
 * @see {@link GoogleAuthStrategy} - OAuth 인증 전략
 */
describe('Auth E2E', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let authService: AuthService;

  /**
   * Mock OAuth 인증 결과
   *
   * @description
   * GoogleAuthStrategy.verifyOAuthToken()이 반환할 Mock 데이터입니다.
   * 실제 Google OAuth 서버 대신 이 데이터를 사용합니다.
   */
  const mockOAuthResult = {
    uid: 'google-oauth-uid-123',
    email: 'test-oauth@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeAll(async () => {
    const testModule = await TestModuleBuilder.create()
      .withModule(AuthModule)
      .mockGuard(AuthGuard) // AuthGuard bypass - 인증 불필요
      .mockGuard(WorkspaceMemberGuard) // WorkspaceMemberGuard bypass
      .build();

    orm = testModule.get<MikroORM>(MikroORM);
    em = orm.em.fork() as any;
    authService = testModule.get<AuthService>(AuthService);

    /**
     * GoogleAuthStrategy Mock 설정
     *
     * @description
     * authService.strategies[OAuthType.GOOGLE].verifyOAuthToken을 Mock하여
     * 실제 Google OAuth 서버 호출 없이 테스트합니다.
     */
    const googleStrategy = (authService as any).strategies[OAuthType.GOOGLE];
    jest
      .spyOn(googleStrategy, 'verifyOAuthToken')
      .mockResolvedValue(mockOAuthResult);

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

  describe('POST /auth/sign-in/:type', () => {
    describe('신규 사용자 회원가입', () => {
      it('Google OAuth로 신규 사용자를 생성해야 함', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 'mock-google-auth-code' })
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
      });

      it('JWT 토큰에 사용자 정보가 포함되어야 함', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 'mock-google-auth-code-2' })
          .expect(201);

        const { accessToken } = response.body;

        // JWT 토큰 디코딩 (base64)
        const [, payloadBase64] = accessToken.split('.');
        const payload = JSON.parse(
          Buffer.from(payloadBase64, 'base64').toString()
        );

        expect(payload).toHaveProperty('uid');
        expect(payload).toHaveProperty('id');
        expect(payload.uid).toBe(mockOAuthResult.uid);
      });

      it('신규 사용자에게 기본 워크스페이스를 생성해야 함', async () => {
        const uniqueUid = `google-oauth-uid-${Date.now()}`;
        const uniqueEmail = `test-${Date.now()}@example.com`;

        const mockUniqueOAuthResult = {
          uid: uniqueUid,
          email: uniqueEmail,
          firstName: 'New',
          lastName: 'User',
        };

        const googleStrategy = (authService as any).strategies[
          OAuthType.GOOGLE
        ];
        jest
          .spyOn(googleStrategy, 'verifyOAuthToken')
          .mockResolvedValueOnce(mockUniqueOAuthResult);

        const response = await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 'mock-code-new-user' })
          .expect(201);

        expect(response.body.accessToken).toBeDefined();

        // 사용자가 실제로 생성되었는지 확인
        const user = await em
          .getRepository(User)
          .findOne({ uid: uniqueUid });
        expect(user).toBeDefined();
        expect(user!.email).toBe(uniqueEmail);
        expect(user!.firstName).toBe('New');
        expect(user!.lastName).toBe('User');

        // 워크스페이스가 자동 생성되었는지 확인
        const workspaceMember = await em
          .getRepository(WorkspaceMember)
          .findOne({ user: user!.id }, { populate: ['workspace'] });

        expect(workspaceMember).toBeDefined();
        expect(workspaceMember!.workspace.name).toBe("New's Workspace");
      });
    });

    describe('기존 사용자 로그인', () => {
      it('기존 사용자가 로그인해야 함', async () => {
        // 1. 사용자 사전 생성
        const existingUser = await createUserFixture(em, {
          uid: 'existing-google-uid-123',
          email: 'existing@example.com',
          firstName: 'Existing',
          lastName: 'User',
        });

        // 2. Mock OAuth 결과를 기존 사용자 정보로 설정
        const mockExistingOAuthResult = {
          uid: existingUser.uid,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        };

        const googleStrategy = (authService as any).strategies[
          OAuthType.GOOGLE
        ];
        jest
          .spyOn(googleStrategy, 'verifyOAuthToken')
          .mockResolvedValueOnce(mockExistingOAuthResult);

        // 3. 로그인 요청
        const response = await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 'mock-code-existing-user' })
          .expect(201);

        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();

        // 4. JWT 토큰에 기존 사용자 정보가 포함되었는지 확인
        const [, payloadBase64] = response.body.accessToken.split('.');
        const payload = JSON.parse(
          Buffer.from(payloadBase64, 'base64').toString()
        );

        expect(payload.uid).toBe(existingUser.uid);
        expect(payload.id).toBe(existingUser.id);
      });

      it('기존 사용자는 새 워크스페이스를 생성하지 않아야 함', async () => {
        // 1. 사용자 사전 생성
        const existingUser = await createUserFixture(em, {
          uid: `existing-google-uid-${Date.now()}`,
          email: `existing-${Date.now()}@example.com`,
          firstName: 'Existing2',
          lastName: 'User2',
        });

        const initialWorkspaceCount = await em
          .getRepository(Workspace)
          .count();

        // 2. Mock OAuth 결과
        const mockExistingOAuthResult = {
          uid: existingUser.uid,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        };

        const googleStrategy = (authService as any).strategies[
          OAuthType.GOOGLE
        ];
        jest
          .spyOn(googleStrategy, 'verifyOAuthToken')
          .mockResolvedValueOnce(mockExistingOAuthResult);

        // 3. 로그인 요청
        await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 'mock-code-existing-user-2' })
          .expect(201);

        // 4. 워크스페이스가 새로 생성되지 않았는지 확인
        const finalWorkspaceCount = await em
          .getRepository(Workspace)
          .count();
        expect(finalWorkspaceCount).toBe(initialWorkspaceCount);
      });
    });

    describe('검증 및 에러 처리', () => {
      it('code 필드가 없으면 400 에러를 반환해야 함', async () => {
        await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({})
          .expect(400);
      });

      it('유효하지 않은 OAuth 타입에 대해 400 에러를 반환해야 함', async () => {
        await request(app.getHttpServer())
          .post('/auth/sign-in/invalid-type')
          .send({ code: 'mock-code' })
          .expect(400);
      });

      it('code가 문자열이 아니면 400 에러를 반환해야 함', async () => {
        await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 12345 })
          .expect(400);
      });
    });

    describe('토큰 만료 시간', () => {
      it('accessToken과 refreshToken이 다른 만료 시간을 가져야 함', async () => {
        const uniqueUid = `google-oauth-uid-token-${Date.now()}`;

        const mockTokenOAuthResult = {
          uid: uniqueUid,
          email: `token-${Date.now()}@example.com`,
          firstName: 'Token',
          lastName: 'Test',
        };

        const googleStrategy = (authService as any).strategies[
          OAuthType.GOOGLE
        ];
        jest
          .spyOn(googleStrategy, 'verifyOAuthToken')
          .mockResolvedValueOnce(mockTokenOAuthResult);

        const response = await request(app.getHttpServer())
          .post('/auth/sign-in/google')
          .send({ code: 'mock-code-token-test' })
          .expect(201);

        const { accessToken, refreshToken } = response.body;

        // JWT 토큰 디코딩하여 만료 시간 확인
        const [, accessPayloadBase64] = accessToken.split('.');
        const [, refreshPayloadBase64] = refreshToken.split('.');

        const accessPayload = JSON.parse(
          Buffer.from(accessPayloadBase64, 'base64').toString()
        );
        const refreshPayload = JSON.parse(
          Buffer.from(refreshPayloadBase64, 'base64').toString()
        );

        expect(accessPayload.exp).toBeDefined();
        expect(refreshPayload.exp).toBeDefined();
        expect(refreshPayload.exp).toBeGreaterThan(accessPayload.exp);
      });
    });
  });
});
