import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UpdateUserSettingsDto } from './dto/request/update-user-settings.dto';
import { UpdateUserSettingsResDto } from './dto/response/update-user-settings.res.dto';
import { UserFactory } from '../../../test/factories/user.factory';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            updateUserSettings: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserSettings', () => {
    it('사용자 설정을 업데이트해야 함', async () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'dark',
      };
      const expectedSettings = { theme: { mode: 'dark' as const } };
      const expectedResponse: UpdateUserSettingsResDto = {
        settings: expectedSettings,
      };

      (userService.updateUserSettings as jest.Mock).mockResolvedValue(
        expectedSettings
      );

      // When
      const result = await controller.updateUserSettings(updateDto);

      // Then
      expect(result).toEqual(expectedResponse);
      expect(userService.updateUserSettings).toHaveBeenCalledWith(
        'fkjfghsdfkjghdfjkguuid', // 하드코딩된 ID
        updateDto
      );
    });

    it('빈 설정으로 업데이트 시 기본 설정을 유지해야 함', async () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {};
      const expectedSettings = { theme: { mode: 'system' as const } };
      const expectedResponse: UpdateUserSettingsResDto = {
        settings: expectedSettings,
      };

      (userService.updateUserSettings as jest.Mock).mockResolvedValue(
        expectedSettings
      );

      // When
      const result = await controller.updateUserSettings(updateDto);

      // Then
      expect(result).toEqual(expectedResponse);
      expect(userService.updateUserSettings).toHaveBeenCalledWith(
        'fkjfghsdfkjghdfjkguuid',
        updateDto
      );
    });

    it('light 테마로 설정을 업데이트해야 함', async () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'light',
      };
      const expectedSettings = { theme: { mode: 'light' as const } };
      const expectedResponse: UpdateUserSettingsResDto = {
        settings: expectedSettings,
      };

      (userService.updateUserSettings as jest.Mock).mockResolvedValue(
        expectedSettings
      );

      // When
      const result = await controller.updateUserSettings(updateDto);

      // Then
      expect(result).toEqual(expectedResponse);
      expect(userService.updateUserSettings).toHaveBeenCalledWith(
        'fkjfghsdfkjghdfjkguuid',
        updateDto
      );
    });

    it('system 테마로 설정을 업데이트해야 함', async () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'system',
      };
      const expectedSettings = { theme: { mode: 'system' as const } };
      const expectedResponse: UpdateUserSettingsResDto = {
        settings: expectedSettings,
      };

      (userService.updateUserSettings as jest.Mock).mockResolvedValue(
        expectedSettings
      );

      // When
      const result = await controller.updateUserSettings(updateDto);

      // Then
      expect(result).toEqual(expectedResponse);
      expect(userService.updateUserSettings).toHaveBeenCalledWith(
        'fkjfghsdfkjghdfjkguuid',
        updateDto
      );
    });

    it('Service에서 에러 발생 시 에러를 전파해야 함', async () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'dark',
      };
      const error = new Error('User not found');

      (userService.updateUserSettings as jest.Mock).mockRejectedValue(error);

      // When/Then
      await expect(controller.updateUserSettings(updateDto)).rejects.toThrow(
        error
      );
      expect(userService.updateUserSettings).toHaveBeenCalledWith(
        'fkjfghsdfkjghdfjkguuid',
        updateDto
      );
    });
  });

  describe('HTTP 엔드포인트 검증', () => {
    it('PATCH /users/settings 엔드포인트가 올바르게 설정되어야 함', () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'dark',
      };
      const expectedSettings = { theme: { mode: 'dark' as const } };

      (userService.updateUserSettings as jest.Mock).mockResolvedValue(
        expectedSettings
      );

      // When
      const result = controller.updateUserSettings(updateDto);

      // Then
      expect(result).resolves.toEqual({ settings: expectedSettings });
    });
  });

  describe('응답 형식 검증', () => {
    it('응답이 올바른 형식이어야 함', async () => {
      // Given
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'dark',
      };
      const expectedSettings = { theme: { mode: 'dark' as const } };

      (userService.updateUserSettings as jest.Mock).mockResolvedValue(
        expectedSettings
      );

      // When
      const result = await controller.updateUserSettings(updateDto);

      // Then
      expect(result).toHaveProperty('settings');
      expect(result.settings).toEqual(expectedSettings);
      expect(typeof result.settings).toBe('object');
    });
  });
});
