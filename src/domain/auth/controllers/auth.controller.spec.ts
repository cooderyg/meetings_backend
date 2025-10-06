import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { OAuthTypeParamDto } from '../dto/request/oauth-type.param.dto';
import { SignInGoogleDto } from '../dto/request/sign-in-google.dto';
import { TokenResponseDto } from '../dto/response/token-res.dto';
import { OAuthType } from '../enums/oauth-type.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('Google OAuth로 로그인을 성공적으로 처리해야 함', async () => {
      // Given
      const param: OAuthTypeParamDto = { type: OAuthType.GOOGLE };
      const dto: SignInGoogleDto = { code: 'google-auth-code' };
      const expectedResponse: TokenResponseDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      jest.spyOn(authService, 'signIn').mockResolvedValue(expectedResponse);

      // When
      const result = await controller.signIn(param, dto);

      // Then
      expect(result).toEqual(expectedResponse);
      expect(authService.signIn).toHaveBeenCalledWith({
        code: dto.code,
        type: param.type,
      });
    });

    it('다른 OAuth 타입으로 로그인을 처리해야 함', async () => {
      // Given
      const param: OAuthTypeParamDto = { type: OAuthType.GOOGLE };
      const dto: SignInGoogleDto = { code: 'different-auth-code' };
      const expectedResponse: TokenResponseDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      jest.spyOn(authService, 'signIn').mockResolvedValue(expectedResponse);

      // When
      const result = await controller.signIn(param, dto);

      // Then
      expect(result).toEqual(expectedResponse);
      expect(authService.signIn).toHaveBeenCalledWith({
        code: dto.code,
        type: param.type,
      });
    });

    it('AuthService에서 에러가 발생하면 에러를 전파해야 함', async () => {
      // Given
      const param: OAuthTypeParamDto = { type: OAuthType.GOOGLE };
      const dto: SignInGoogleDto = { code: 'invalid-code' };
      const error = new Error('Invalid OAuth code');

      jest.spyOn(authService, 'signIn').mockRejectedValue(error);

      // When & Then
      await expect(controller.signIn(param, dto)).rejects.toThrow(error);
      expect(authService.signIn).toHaveBeenCalledWith({
        code: dto.code,
        type: param.type,
      });
    });
  });
});
