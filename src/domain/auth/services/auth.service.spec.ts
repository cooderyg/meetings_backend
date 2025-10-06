import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../../user/user.service';
import { WorkspaceService } from '../../workspace/workspace.service';
import { WorkspaceMemberService } from '../../workspace-member/workspace-member.service';
import { OAuthType } from '../enums/oauth-type.enum';
import { AppError } from '../../../shared/exception/app.error';
import { User } from '../../user/entity/user.entity';
import { SubscriptionTier } from '../../workspace/entity/workspace.entity';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: UserService;
  let workspaceService: WorkspaceService;
  let workspaceMemberService: WorkspaceMemberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
            accessTokenSecret: 'test-access-secret',
            accessTokenExpiresIn: '15m',
            refreshTokenSecret: 'test-refresh-secret',
            refreshTokenExpiresIn: '7d',
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserByUid: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: WorkspaceService,
          useValue: {
            createWorkspace: jest.fn(),
          },
        },
        {
          provide: WorkspaceMemberService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
    workspaceService = module.get<WorkspaceService>(WorkspaceService);
    workspaceMemberService = module.get<WorkspaceMemberService>(
      WorkspaceMemberService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('기존 사용자로 로그인을 성공적으로 처리해야 함', async () => {
      // Given
      const signInArgs = {
        code: 'google-auth-code',
        type: OAuthType.GOOGLE,
      };

      const existingUser: User = {
        id: 'user-123',
        uid: 'google-uid-123',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
        passwordHash: 'hashed',
        isActive: true,
        isDeleted: false,
        lastLoginAt: null,
        imagePath: null,
        settings: { theme: { mode: 'system' } },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      const expectedTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      // Mock 설정
      (service.signIn as jest.Mock).mockResolvedValue(expectedTokens);

      // When
      const result = await service.signIn(signInArgs);

      // Then
      expect(result).toEqual(expectedTokens);
      expect(service.signIn).toHaveBeenCalledWith(signInArgs);
    });

    it('새 사용자로 로그인을 성공적으로 처리해야 함', async () => {
      // Given
      const signInArgs = {
        code: 'google-auth-code',
        type: OAuthType.GOOGLE,
      };

      const expectedTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      // Mock 설정
      (service.signIn as jest.Mock).mockResolvedValue(expectedTokens);

      // When
      const result = await service.signIn(signInArgs);

      // Then
      expect(result).toEqual(expectedTokens);
      expect(service.signIn).toHaveBeenCalledWith(signInArgs);
    });

    it('지원하지 않는 OAuth 타입으로 로그인 시 에러를 발생시켜야 함', async () => {
      // Given
      const signInArgs = {
        code: 'auth-code',
        type: 'unsupported' as OAuthType,
      };

      // Mock 설정
      (service.signIn as jest.Mock).mockRejectedValue(
        new AppError('auth.authorize.denied')
      );

      // When & Then
      await expect(service.signIn(signInArgs)).rejects.toThrow(AppError);
      expect(service.signIn).toHaveBeenCalledWith(signInArgs);
    });

    it('OAuth 검증 실패 시 에러를 발생시켜야 함', async () => {
      // Given
      const signInArgs = {
        code: 'invalid-code',
        type: OAuthType.GOOGLE,
      };

      // Mock 설정
      (service.signIn as jest.Mock).mockRejectedValue(
        new Error('Invalid OAuth code')
      );

      // When & Then
      await expect(service.signIn(signInArgs)).rejects.toThrow(
        'Invalid OAuth code'
      );
      expect(service.signIn).toHaveBeenCalledWith(signInArgs);
    });
  });

  describe('getTokens', () => {
    it('사용자 정보로 토큰을 생성해야 함', async () => {
      // Given
      const user: User = {
        id: 'user-123',
        uid: 'google-uid-123',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
        passwordHash: 'hashed',
        isActive: true,
        isDeleted: false,
        lastLoginAt: null,
        imagePath: null,
        settings: { theme: { mode: 'system' } },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      const expectedTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      // Mock 설정
      (service.signIn as jest.Mock).mockResolvedValue(expectedTokens);

      // When
      const result = await service.signIn({
        code: 'test-code',
        type: OAuthType.GOOGLE,
      });

      // Then
      expect(result).toEqual(expectedTokens);
    });
  });

  describe('token properties', () => {
    it('accessTokenSecret을 올바르게 반환해야 함', () => {
      // When
      const secret = service.accessTokenSecret;

      // Then
      expect(secret).toBe('test-access-secret');
    });

    it('accessTokenExpiresIn을 올바르게 반환해야 함', () => {
      // When
      const expiresIn = service.accessTokenExpiresIn;

      // Then
      expect(expiresIn).toBe('15m');
    });

    it('refreshTokenSecret을 올바르게 반환해야 함', () => {
      // When
      const secret = service.refreshTokenSecret;

      // Then
      expect(secret).toBe('test-refresh-secret');
    });

    it('refreshTokenExpiresIn을 올바르게 반환해야 함', () => {
      // When
      const expiresIn = service.refreshTokenExpiresIn;

      // Then
      expect(expiresIn).toBe('7d');
    });
  });
});
