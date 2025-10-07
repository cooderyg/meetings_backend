import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { AppError } from '../../shared/exception/app.error';
import { UserModule } from './user.module';
import { AuthGuard } from '../../shared/guard/auth.guard';

describe('UserService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: UserService;
  let repository: UserRepository;
  const containerKey = 'user-service-integration-test';

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(UserModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);

    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    await orm.em.begin();
  });

  afterEach(async () => {
    await orm.em.rollback();
    orm.em.clear();
  });

  afterAll(async () => {
    if (em) {
      await em.getConnection().close(true);
    }

    if (orm) {
      await orm.close();
    }

    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('createUser', () => {
    it('uid로 User를 생성해야 함', async () => {
      // Given
      const userData = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
      };

      // When
      const user = await service.createUser(userData);

      // Then
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.uid).toBe('test-uid-123');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('길동');
      expect(user.lastName).toBe('홍');
      expect(user.isActive).toBe(true);
      expect(user.isDeleted).toBe(false);
    });

    it('uid와 passwordHash를 모두 제공하여 User를 생성해야 함', async () => {
      // Given
      const userData = {
        uid: 'test-uid-with-password',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
        passwordHash: 'hashed_password',
      };

      // When
      const user = await service.createUser(userData);

      // Then
      expect(user).toBeDefined();
      expect(user.uid).toBe('test-uid-with-password');
      expect(user.passwordHash).toBe('hashed_password');
    });

    it('uid가 없으면 AppError를 던져야 함', async () => {
      // Given
      const userData = {
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
      };

      // When/Then
      await expect(service.createUser(userData)).rejects.toThrow(AppError);
      await expect(service.createUser(userData)).rejects.toMatchObject({
        code: 'validation.form.failed',
      });
    });

    it('@Transactional로 User가 자동으로 flush되어야 함', async () => {
      // Given
      const userData = {
        uid: 'test-uid',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
      };

      // When
      const user = await service.createUser(userData);
      const userId = user.id;

      em.clear();

      // Then - 새 컨텍스트에서 조회 가능해야 함
      const found = await repository.findById(userId);
      expect(found).toBeDefined();
      expect(found!.id).toBe(userId);
    });

    it('기본 설정으로 User를 생성해야 함', async () => {
      // Given
      const userData = {
        uid: 'test-uid',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
      };

      // When
      const user = await service.createUser(userData);

      // Then
      expect(user.settings).toEqual({ theme: { mode: 'system' } });
    });
  });

  describe('getUserByUid', () => {
    it('uid로 User를 찾아야 함', async () => {
      // Given
      const created = await service.createUser({
        uid: 'find-test-uid',
        email: 'find@example.com',
        firstName: '길동',
        lastName: '홍',
      });

      em.clear();

      // When
      const found = await service.getUserByUid('find-test-uid');

      // Then
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.uid).toBe('find-test-uid');
    });

    it('존재하지 않는 uid에 대해 null을 반환해야 함', async () => {
      // When
      const found = await service.getUserByUid('non-existent-uid');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('ID로 User를 찾아야 함', async () => {
      // Given
      const created = await service.createUser({
        uid: 'test-uid',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
      });

      const userId = created.id;
      em.clear();

      // When
      const found = await service.getUserById(userId);

      // Then
      expect(found).toBeDefined();
      expect(found!.id).toBe(userId);
    });

    it('존재하지 않는 ID에 대해 null을 반환해야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When
      const found = await service.getUserById(nonExistentId);

      // Then
      expect(found).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('이메일로 User를 찾아야 함', async () => {
      // Given
      const created = await service.createUser({
        uid: 'test-uid',
        email: 'email-test@example.com',
        firstName: '길동',
        lastName: '홍',
      });

      em.clear();

      // When
      const found = await service.getUserByEmail('email-test@example.com');

      // Then
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.email).toBe('email-test@example.com');
    });

    it('존재하지 않는 이메일에 대해 null을 반환해야 함', async () => {
      // When
      const found = await service.getUserByEmail('nonexistent@example.com');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('updateUserSettings', () => {
    it('User 설정을 업데이트해야 함', async () => {
      // Given
      const user = await service.createUser({
        uid: 'settings-test-uid',
        email: 'settings@example.com',
        firstName: '길동',
        lastName: '홍',
      });

      const userId = user.id;
      em.clear();

      // When
      const updatedSettings = await service.updateUserSettings(userId, {
        themeMode: 'dark',
      });

      // Then
      expect(updatedSettings.theme.mode).toBe('dark');
    });

    it('@Transactional로 설정 업데이트가 자동으로 flush되어야 함', async () => {
      // Given
      const user = await service.createUser({
        uid: 'settings-persist-uid',
        email: 'persist@example.com',
        firstName: '길동',
        lastName: '홍',
      });

      const userId = user.id;
      em.clear();

      // When
      await service.updateUserSettings(userId, { themeMode: 'light' });
      em.clear();

      // Then
      const found = await repository.findById(userId);
      expect(found!.settings.theme.mode).toBe('light');
    });

    it('존재하지 않는 User 설정 업데이트 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(
        service.updateUserSettings(nonExistentId, { themeMode: 'dark' })
      ).rejects.toThrow(AppError);
      await expect(
        service.updateUserSettings(nonExistentId, { themeMode: 'dark' })
      ).rejects.toMatchObject({
        code: 'user.fetch.notFound',
      });
    });

    it('기존 설정을 유지하면서 특정 값만 업데이트해야 함', async () => {
      // Given
      const user = await service.createUser({
        uid: 'merge-test-uid',
        email: 'merge@example.com',
        firstName: '길동',
        lastName: '홍',
      });

      const userId = user.id;
      em.clear();

      // 첫 번째 업데이트
      await service.updateUserSettings(userId, { themeMode: 'dark' });
      em.clear();

      // When - 두 번째 업데이트 (다른 값)
      await service.updateUserSettings(userId, { themeMode: 'system' });
      em.clear();

      // Then
      const found = await repository.findById(userId);
      expect(found!.settings.theme.mode).toBe('system');
    });
  });
});
