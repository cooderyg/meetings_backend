import { User } from '../../src/domain/user/entity/user.entity';
import { v4 as uuid } from 'uuid';

/**
 * User 테스트 데이터 생성 Factory
 *
 * @example
 * const user = UserFactory.create();
 * const userWithEmail = UserFactory.create({ email: 'custom@example.com' });
 * const users = UserFactory.createMany(5);
 */
export class UserFactory {
  /**
   * 단일 User 엔티티 생성
   */
  static create(overrides: Partial<User> = {}): User {
    const user = new User();

    // 기본값 설정
    Object.assign(user, {
      id: overrides.id || uuid(),
      uid: overrides.uid || uuid(),
      email:
        overrides.email ||
        `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
      firstName: overrides.firstName || '길동',
      lastName: overrides.lastName || '홍',
      passwordHash: overrides.passwordHash || 'hashed_password',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      isDeleted:
        overrides.isDeleted !== undefined ? overrides.isDeleted : false,
      lastLoginAt: overrides.lastLoginAt || null,
      imagePath: overrides.imagePath || null,
      settings: overrides.settings || { theme: { mode: 'system' as const } },
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    });

    return user;
  }

  /**
   * 여러 User 엔티티 생성
   */
  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        email: overrides.email || `test-${index}-${Date.now()}@example.com`,
      })
    );
  }

  /**
   * 활성 사용자 생성
   */
  static createActive(overrides: Partial<User> = {}): User {
    return this.create({
      ...overrides,
      isActive: true,
      isDeleted: false,
    });
  }

  /**
   * 비활성 사용자 생성
   */
  static createInactive(overrides: Partial<User> = {}): User {
    return this.create({
      ...overrides,
      isActive: false,
    });
  }

  /**
   * 삭제된 사용자 생성
   */
  static createDeleted(overrides: Partial<User> = {}): User {
    return this.create({
      ...overrides,
      isDeleted: true,
    });
  }

  /**
   * 특정 이메일 도메인을 가진 사용자 생성
   */
  static createWithEmailDomain(
    domain: string,
    overrides: Partial<User> = {}
  ): User {
    return this.create({
      ...overrides,
      email: `test-${Date.now()}@${domain}`,
    });
  }

  /**
   * 로그인한 사용자 생성 (lastLoginAt 설정)
   */
  static createWithLastLogin(overrides: Partial<User> = {}): User {
    return this.create({
      ...overrides,
      lastLoginAt: new Date(),
    });
  }

  /**
   * 특정 테마 설정을 가진 사용자 생성
   */
  static createWithTheme(
    themeMode: 'system' | 'light' | 'dark',
    overrides: Partial<User> = {}
  ): User {
    return this.create({
      ...overrides,
      settings: { theme: { mode: themeMode } },
    });
  }
}
