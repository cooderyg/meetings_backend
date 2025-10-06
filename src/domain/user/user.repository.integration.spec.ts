import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { UserModule } from './user.module';
import { UserRepository } from './user.repository';
import { User } from './entity/user.entity';
import { UserFactory } from '../../../test/factories/user.factory';
import { v4 as uuid } from 'uuid';

describe('UserRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let userRepository: UserRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'user-integration-test';

  // User 생성 헬퍼 함수 (Factory 패턴 사용)
  const createUser = async (overrides: Partial<User> = {}) => {
    const user = UserFactory.create(overrides);
    await em.persistAndFlush(user);
    return user;
  };

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    module = await TestModuleBuilder.create()
      .withModule(UserModule)
      .withTestcontainer(containerKey)
      .build();

    userRepository = module.get<UserRepository>(UserRepository);
    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성 (기존 스키마 삭제 후 재생성)
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000); // Testcontainer 시작 시간 고려

  afterAll(async () => {
    // 정리 작업
    if (em) {
      await em.getConnection().close(true);
    }

    if (module) {
      await module.close();
    }

    // Testcontainer 정리
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 초기화
    await em.execute('TRUNCATE TABLE "users" CASCADE');
    await em.clear();
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 찾아야 함', async () => {
      // Given
      const email = 'test@example.com';
      const user = await createUser({ email });

      // When
      const foundUser = await userRepository.findByEmail(email);

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(email);
      expect(foundUser?.firstName).toBe('길동');
      expect(foundUser?.lastName).toBe('홍');
    });

    it('존재하지 않는 이메일로 조회 시 null을 반환해야 함', async () => {
      // Given
      const nonExistentEmail = 'notfound@example.com';

      // When
      const foundUser = await userRepository.findByEmail(nonExistentEmail);

      // Then
      expect(foundUser).toBeNull();
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 찾아야 함', async () => {
      // Given
      const user = await createUser({
        email: 'findbyid@example.com',
      });

      // When
      const foundUser = await userRepository.findById(user.id);

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
      expect(foundUser?.email).toBe('findbyid@example.com');
    });

    it('존재하지 않는 ID로 조회 시 null을 반환해야 함', async () => {
      // Given
      const nonExistentId = uuid();

      // When
      const foundUser = await userRepository.findById(nonExistentId);

      // Then
      expect(foundUser).toBeNull();
    });
  });

  describe('findByUid', () => {
    it('UID로 사용자를 찾아야 함', async () => {
      // Given
      const uid = uuid();
      const user = await createUser({
        uid,
        email: 'findbyuid@example.com',
      });

      // When
      const foundUser = await userRepository.findByUid(uid);

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser?.uid).toBe(uid);
      expect(foundUser?.email).toBe('findbyuid@example.com');
    });
  });

  describe('updateUser', () => {
    it('사용자 정보를 업데이트해야 함', async () => {
      // Given
      const user = await createUser({
        email: 'update@example.com',
      });

      // When - 사용자 정보 수정
      user.firstName = '철수';
      user.lastName = '김';
      user.lastLoginAt = new Date();
      await userRepository.updateUser(user);

      // Then - DB에서 직접 확인
      await em.clear(); // 캐시 초기화
      const updatedUser = await em.findOne(User, { id: user.id });
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.firstName).toBe('철수');
      expect(updatedUser?.lastName).toBe('김');
      expect(updatedUser?.lastLoginAt).toBeDefined();
    });
  });

  describe('데이터 무결성', () => {
    it('중복된 이메일로 사용자 생성 시 실패해야 함', async () => {
      // Given
      const email = 'duplicate@example.com';
      await createUser({ email });

      // When/Then - 동일한 이메일로 다른 사용자 생성 시도
      await expect(createUser({ email })).rejects.toThrow();
    });

    it('중복된 UID로 사용자 생성 시 실패해야 함', async () => {
      // Given
      const uid = uuid();
      await createUser({ uid, email: 'user1@example.com' });

      // When/Then - 동일한 UID로 다른 사용자 생성 시도
      await expect(
        createUser({ uid, email: 'user2@example.com' })
      ).rejects.toThrow();
    });
  });

  describe('트랜잭션 처리', () => {
    it('트랜잭션 내에서 여러 작업이 원자적으로 처리되어야 함', async () => {
      // Given
      const email1 = 'tx1@example.com';
      const email2 = 'tx2@example.com';

      // When - 트랜잭션 내에서 작업
      await em.transactional(async (txEm) => {
        const user1 = new User();
        Object.assign(user1, {
          uid: uuid(),
          email: email1,
          firstName: '트랜잭션1',
          lastName: '사용자',
          passwordHash: 'hashed_password',
          isActive: true,
          isDeleted: false,
          settings: { theme: { mode: 'system' } },
        });

        const user2 = new User();
        Object.assign(user2, {
          uid: uuid(),
          email: email2,
          firstName: '트랜잭션2',
          lastName: '사용자',
          passwordHash: 'hashed_password',
          isActive: true,
          isDeleted: false,
          settings: { theme: { mode: 'system' } },
        });

        await txEm.persistAndFlush([user1, user2]);
      });

      // Then
      const users = await em.find(User, {});
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.email).sort()).toEqual([
        'tx1@example.com',
        'tx2@example.com',
      ]);
    });

    it('트랜잭션 실패 시 모든 변경사항이 롤백되어야 함', async () => {
      // Given
      const email = 'valid@example.com';

      // When - 트랜잭션 내에서 일부러 실패 유도
      try {
        await em.transactional(async (txEm) => {
          // 첫 번째 사용자 생성 (성공)
          const user1 = new User();
          Object.assign(user1, {
            uid: uuid(),
            email,
            firstName: '유효한',
            lastName: '사용자',
            passwordHash: 'hashed_password',
            isActive: true,
            isDeleted: false,
            settings: { theme: { mode: 'system' } },
          });
          await txEm.persistAndFlush(user1);

          // 두 번째 사용자 생성 (중복 이메일로 실패 유도)
          const user2 = new User();
          Object.assign(user2, {
            uid: uuid(),
            email, // 중복 이메일
            firstName: '중복',
            lastName: '사용자',
            passwordHash: 'hashed_password',
            isActive: true,
            isDeleted: false,
            settings: { theme: { mode: 'system' } },
          });
          await txEm.persistAndFlush(user2);
        });
      } catch (error) {
        // 트랜잭션 롤백됨
      }

      // Then - 아무 사용자도 생성되지 않아야 함
      const users = await em.find(User, {});
      expect(users).toHaveLength(0);
    });
  });

  describe('병렬 테스트 격리성', () => {
    it('각 테스트가 독립적인 데이터베이스 컨텍스트에서 실행되어야 함', async () => {
      // Given - 이 테스트만의 고유한 데이터 생성
      const uniqueEmail = `parallel_${Date.now()}@example.com`;
      const user = await createUser({
        email: uniqueEmail,
        firstName: '병렬테스트',
      });

      // When
      const foundUser = await userRepository.findByEmail(uniqueEmail);

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(uniqueEmail);

      // 다른 테스트 컨테이너와 격리되어 있으므로
      // 이 데이터는 다른 테스트에 영향을 주지 않음
    });
  });
});
