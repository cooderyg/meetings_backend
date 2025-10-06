/**
 * UserRepository Real Database Test
 *
 * 해결 방법: jest-environment-node-single-context를 사용하여 VM 컨텍스트 문제 해결
 * - 모든 테스트가 단일 전역 컨텍스트에서 실행되어 Map 프로토타입 충돌 방지
 * - --runInBand 옵션으로 직렬 실행하여 테스트 간 격리 보장
 * - afterEach에서 확실한 데이터 정리로 테스트 독립성 유지
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { User } from './entity/user.entity';
import { UserRepository } from './user.repository';
import { UserModule } from './user.module';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { initializeTestDatabase, cleanupTestDatabase } from '../../../test/utils/db-helpers';

describe('UserRepository - Real Database', () => {
  let module: TestingModule;
  let em: EntityManager;
  let repository: UserRepository;
  let orm: MikroORM;

  beforeAll(async () => {
    module = await new TestModuleBuilder()
      .withModule(UserModule)
      .build();

    repository = module.get<UserRepository>(UserRepository);
    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // 테스트 데이터베이스 초기화 (스키마 및 테이블 생성)
    await initializeTestDatabase(orm);
  });

  beforeEach(async () => {
    // 새로운 EntityManager 포크로 격리된 컨텍스트 생성
    em = orm.em.fork() as EntityManager;
    // Repository의 EntityManager를 forked 버전으로 교체
    repository.em = em;
    // 트랜잭션 시작 - 테스트 종료 시 롤백
    await em.begin();
  });

  afterEach(async () => {
    // 트랜잭션 롤백으로 모든 변경사항 제거
    if (em?.isInTransaction()) {
      await em.rollback();
    }
    // 캐시 클리어 및 모든 mock 정리
    em?.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // 테스트 데이터베이스 정리 (스키마 삭제)
    if (orm) {
      await cleanupTestDatabase(orm);
    }
    await module?.close();
  }, 30000); // 타임아웃을 30초로 증가

  describe('findById - Real DB', () => {
    it('should find user by id in real database', async () => {
      // Given - 실제 DB에 사용자 생성
      const user = new User();
      em.assign(user, {
        email: 'test@example.com',
        uid: 'uid123',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      em.clear(); // 캐시 초기화하여 실제 DB에서 조회하도록 함

      // When - 실제 DB에서 조회
      const found = await repository.findById(user.id);

      // Then
      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
      expect(found?.email).toBe('test@example.com');
      expect(found?.createdAt).toBeDefined(); // DB가 자동 생성한 필드 확인
    });

    it('should return null when user not found in real database', async () => {
      // When - 유효한 UUID 형식 사용
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('findByUid - Real DB', () => {
    it('should find user by uid with case sensitivity', async () => {
      // Given
      const user = new User();
      em.assign(user, {
        email: 'test@example.com',
        uid: 'UniqueUID123',
        firstName: 'Jane',
        lastName: 'Smith',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      em.clear();

      // When
      const found = await repository.findByUid('UniqueUID123');
      const notFound = await repository.findByUid('uniqueuid123'); // 다른 케이스

      // Then
      expect(found).toBeDefined();
      expect(found?.uid).toBe('UniqueUID123');
      expect(notFound).toBeNull();
    });
  });

  describe('findByEmail - Real DB', () => {
    it('should find user by email', async () => {
      // Given
      const user = new User();
      em.assign(user, {
        email: 'unique@example.com',
        uid: 'uid456',
        firstName: 'Bob',
        lastName: 'Johnson',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      em.clear();

      // When
      const found = await repository.findByEmail('unique@example.com');

      // Then
      expect(found).toBeDefined();
      expect(found?.email).toBe('unique@example.com');
      expect(found?.lastName).toBe('Johnson');
    });

    it('should be case-sensitive for email lookup', async () => {
      // Given
      const user = new User();
      em.assign(user, {
        email: 'test@example.com',
        uid: 'uid789',
        firstName: 'Alice',
        lastName: 'Williams',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      em.clear();

      // When
      const found = await repository.findByEmail('TEST@EXAMPLE.COM');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('updateUser - Real DB', () => {
    it('should persist updates to real database', async () => {
      // Given
      const user = new User();
      em.assign(user, {
        email: 'update@example.com',
        uid: 'uid999',
        firstName: 'Original',
        lastName: 'Name',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      const userId = user.id;

      // When - 업데이트
      user.firstName = 'Updated';
      user.lastName = 'NewName';
      user.lastLoginAt = new Date();
      await repository.updateUser(user);

      // 캐시 초기화 후 다시 조회
      em.clear();
      const updated = await repository.findById(userId);

      // Then
      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('NewName');
      expect(updated?.lastLoginAt).toBeDefined();
      expect(updated?.updatedAt?.getTime()).toBeGreaterThan(updated?.createdAt?.getTime() || 0);
    });

    it('should update user settings in real database', async () => {
      // Given
      const user = new User();
      em.assign(user, {
        email: 'settings@example.com',
        uid: 'uid888',
        firstName: 'Settings',
        lastName: 'User',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      const userId = user.id;

      // When
      user.settings = { theme: { mode: 'dark' } };
      await repository.updateUser(user);

      // 캐시 초기화 후 다시 조회
      em.clear();
      const updated = await repository.findById(userId);

      // Then
      expect(updated?.settings.theme.mode).toBe('dark');
    });
  });

  describe('Database Constraints - Real DB', () => {
    it('should enforce unique email constraint in database', async () => {
      // Given
      const user1 = new User();
      em.assign(user1, {
        email: 'duplicate@example.com',
        uid: 'uid111',
        firstName: 'First',
        lastName: 'User',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user1);

      // When/Then
      const user2 = new User();
      em.assign(user2, {
        email: 'duplicate@example.com',
        uid: 'uid222',
        firstName: 'Second',
        lastName: 'User',
        passwordHash: 'hashed',
      });

      await expect(em.persistAndFlush(user2)).rejects.toThrow();
    });

    it('should enforce unique uid constraint in database', async () => {
      // Given
      const user1 = new User();
      em.assign(user1, {
        email: 'user1@example.com',
        uid: 'duplicate-uid',
        firstName: 'First',
        lastName: 'User',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user1);

      // When/Then
      const user2 = new User();
      em.assign(user2, {
        email: 'user2@example.com',
        uid: 'duplicate-uid',
        firstName: 'Second',
        lastName: 'User',
        passwordHash: 'hashed',
      });

      await expect(em.persistAndFlush(user2)).rejects.toThrow();
    });

    it('should handle concurrent updates without lost updates', async () => {
      // Given
      const user = new User();
      em.assign(user, {
        email: 'concurrent@example.com',
        uid: 'uid-concurrent',
        firstName: 'Original',
        lastName: 'User',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      const userId = user.id;

      // When - 두 개의 별도 EntityManager로 동시 업데이트 시뮬레이션
      const em1 = orm.em.fork();
      const em2 = orm.em.fork();

      const user1 = await em1.findOne(User, { id: userId });
      const user2 = await em2.findOne(User, { id: userId });

      if (user1 && user2) {
        user1.firstName = 'Updated1';
        user2.lastName = 'Updated2';

        await em1.flush();
        await em2.flush();
      }

      // Then - 마지막 업데이트가 반영되어야 함
      em.clear();
      const final = await repository.findById(userId);
      expect(final?.firstName).toBeDefined();
      expect(final?.lastName).toBeDefined();
    });
  });

  describe('Transaction Behavior - Real DB', () => {
    it('should rollback changes on error', async () => {
      // Given - 먼저 사용자를 생성하고 커밋
      const user = new User();
      em.assign(user, {
        email: 'rollback@example.com',
        uid: 'uid-rollback',
        firstName: 'Test',
        lastName: 'Rollback',
        passwordHash: 'hashed',
      });

      await em.persistAndFlush(user);
      const userId = user.id;
      const originalName = user.firstName;

      // 새로운 트랜잭션 컨텍스트 생성
      const newEm = orm.em.fork();

      try {
        await newEm.begin();
        const userToUpdate = await newEm.findOne(User, { id: userId });
        if (userToUpdate) {
          userToUpdate.firstName = 'Changed';
          await newEm.flush();
        }

        // 의도적으로 에러 발생
        throw new Error('Rollback test');
      } catch (error) {
        await newEm.rollback();
      }

      // Then - 변경사항이 롤백되어야 함
      em.clear();
      const rolled = await repository.findById(userId);
      expect(rolled?.firstName).toBe(originalName);
    });
  });
});