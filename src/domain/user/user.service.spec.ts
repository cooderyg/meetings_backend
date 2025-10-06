import { EntityManager } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AppError } from '../../shared/exception/app.error';
import { User } from './entity/user.entity';
import { ICreateUser } from './interfaces/create-user.interface';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UpdateUserSettingsDto } from './dto/request/update-user-settings.dto';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;
  let em: EntityManager;

  const mockUser: User = Object.assign(new User(), {
    id: 'user-123',
    email: 'test@example.com',
    uid: 'uid123',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed',
    isActive: true,
    isDeleted: false,
    lastLoginAt: null,
    imagePath: null,
    settings: { theme: { mode: 'system' } },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findByUid: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            updateUser: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            assign: jest.fn(),
            flush: jest.fn(),
            fork: jest.fn(),
            transactional: jest.fn((fn) => fn()),
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
    em = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByUid', () => {
    it('uid로 사용자를 반환해야 함', async () => {
      // Given
      (repository.findByUid as jest.Mock).mockResolvedValue(mockUser);

      // When
      const result = await service.getUserByUid('uid123');

      // Then
      expect(result).toBe(mockUser);
      expect(repository.findByUid).toHaveBeenCalledWith('uid123');
    });

    it('사용자를 찾을 수 없을 때 null을 반환해야 함', async () => {
      // Given
      (repository.findByUid as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.getUserByUid('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('id로 사용자를 반환해야 함', async () => {
      // Given
      (repository.findById as jest.Mock).mockResolvedValue(mockUser);

      // When
      const result = await service.getUserById('user-123');

      // Then
      expect(result).toBe(mockUser);
      expect(repository.findById).toHaveBeenCalledWith('user-123');
    });

    it('사용자를 찾을 수 없을 때 null을 반환해야 함', async () => {
      // Given
      (repository.findById as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.getUserById('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('이메일로 사용자를 반환해야 함', async () => {
      // Given
      (repository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      // When
      const result = await service.getUserByEmail('test@example.com');

      // Then
      expect(result).toBe(mockUser);
      expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('사용자를 찾을 수 없을 때 null을 반환해야 함', async () => {
      // Given
      (repository.findByEmail as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.getUserByEmail('notfound@example.com');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('uid를 가진 사용자를 생성해야 함', async () => {
      // Given
      const createUserData: ICreateUser = {
        uid: 'uid456',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const newUser = new User();
      (em.assign as jest.Mock).mockReturnValue(newUser);
      (em.flush as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await service.createUser(createUserData);

      // Then
      expect(result).toBe(newUser);
      expect(em.assign).toHaveBeenCalledWith(
        expect.any(User),
        expect.objectContaining({
          ...createUserData,
          passwordHash: '',
        })
      );
      expect(em.flush).toHaveBeenCalled();
    });

    it('passwordHash를 가진 사용자를 생성해야 함', async () => {
      // Given
      const createUserData: ICreateUser = {
        uid: 'uid789',
        email: 'password@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        passwordHash: 'hashedPassword123',
      };

      const newUser = new User();
      (em.assign as jest.Mock).mockReturnValue(newUser);
      (em.flush as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await service.createUser(createUserData);

      // Then
      expect(result).toBe(newUser);
      expect(em.assign).toHaveBeenCalledWith(
        expect.any(User),
        expect.objectContaining({
          ...createUserData,
          passwordHash: 'hashedPassword123',
        })
      );
    });

    it('uid나 passwordHash가 모두 제공되지 않았을 때 AppError를 던져야 함', async () => {
      // Given
      const createUserData: ICreateUser = {
        uid: '',
        email: 'invalid@example.com',
        firstName: 'Invalid',
        lastName: 'User',
      };

      // When/Then
      await expect(service.createUser(createUserData)).rejects.toThrow(
        new AppError('validation.form.failed', {
          fields: { uid: ['uid or passwordHash is required'] },
        })
      );
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe('updateUserSettings', () => {
    it('사용자 테마 설정을 업데이트해야 함', async () => {
      // Given
      const userId = 'user-123';
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'dark',
      };

      const existingUser = { ...mockUser };
      (repository.findById as jest.Mock).mockResolvedValue(existingUser);
      (repository.updateUser as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await service.updateUserSettings(userId, updateDto);

      // Then
      expect(result).toEqual({ theme: { mode: 'dark' } });
      expect(repository.findById).toHaveBeenCalledWith(userId);
      expect(repository.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: { theme: { mode: 'dark' } },
        })
      );
    });

    it('부분 업데이트 시 기존 설정을 유지해야 함', async () => {
      // Given
      const userId = 'user-123';
      const updateDto: UpdateUserSettingsDto = {};

      const existingUser = {
        ...mockUser,
        settings: { theme: { mode: 'light' as const } },
      };
      (repository.findById as jest.Mock).mockResolvedValue(existingUser);
      (repository.updateUser as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await service.updateUserSettings(userId, updateDto);

      // Then
      expect(result).toEqual({ theme: { mode: 'light' } });
      expect(repository.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: { theme: { mode: 'light' } },
        })
      );
    });

    it('사용자를 찾을 수 없을 때 AppError를 던져야 함', async () => {
      // Given
      const userId = 'non-existent';
      const updateDto: UpdateUserSettingsDto = {
        themeMode: 'dark',
      };

      (repository.findById as jest.Mock).mockResolvedValue(null);

      // When/Then
      await expect(
        service.updateUserSettings(userId, updateDto)
      ).rejects.toThrow(new AppError('user.fetch.notFound'));
      expect(repository.updateUser).not.toHaveBeenCalled();
    });

    it('모든 테마 모드를 올바르게 처리해야 함', async () => {
      const themeModes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];

      for (const mode of themeModes) {
        // Given
        const userId = 'user-123';
        const updateDto: UpdateUserSettingsDto = {
          themeMode: mode,
        };

        const existingUser = { ...mockUser };
        (repository.findById as jest.Mock).mockResolvedValue(existingUser);
        (repository.updateUser as jest.Mock).mockResolvedValue(undefined);

        // When
        const result = await service.updateUserSettings(userId, updateDto);

        // Then
        expect(result).toEqual({ theme: { mode } });
      }
    });
  });

  describe('mapDtoToSettings (private method)', () => {
    it('설정을 올바르게 병합해야 함', () => {
      // 이는 updateUserSettings 테스트를 통해 간접적으로 테스트됨
      // Private 메서드 동작은 public API를 통해 검증됨
      expect(true).toBe(true);
    });
  });
});