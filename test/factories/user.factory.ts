import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../../src/domain/user/entity/user.entity';
import { BaseFactory } from './base.factory';
import { testSequence } from '../utils/sequence-generator';

type ThemeMode = 'system' | 'light' | 'dark';

/**
 * User 엔티티용 Test Data Builder
 *
 * @example
 * ```typescript
 * // 기본 User 생성
 * const user = await new UserFactory(em).create();
 *
 * // Fluent API로 커스터마이징
 * const admin = await new UserFactory(em)
 *   .withEmail('admin@example.com')
 *   .withName('Admin', 'User')
 *   .asActive()
 *   .create();
 *
 * // 여러 개 생성
 * const users = await new UserFactory(em).createList(5);
 * ```
 */
export class UserFactory extends BaseFactory<User> {
  private uid?: string;
  private email?: string;
  private firstName?: string;
  private lastName?: string;
  private passwordHash?: string;
  private isActive?: boolean;
  private imagePath?: string | null;
  private settings?: { theme: { mode: ThemeMode } };
  private lastLoginAt?: Date | null;

  build(overrides?: Partial<User>): User {
    const seq = testSequence.next('user');
    const user = new User();

    user.uid = overrides?.uid ?? this.uid ?? `test-uid-${seq}`;
    user.email = overrides?.email ?? this.email ?? `test${seq}@example.com`;
    user.firstName = overrides?.firstName ?? this.firstName ?? '길동';
    user.lastName = overrides?.lastName ?? this.lastName ?? '홍';
    user.passwordHash = overrides?.passwordHash ?? this.passwordHash ?? 'hashed_password';
    user.isActive = overrides?.isActive ?? this.isActive ?? true;
    user.imagePath =
      overrides?.imagePath !== undefined
        ? overrides.imagePath
        : this.imagePath ?? null;
    user.settings = overrides?.settings ?? this.settings ?? { theme: { mode: 'system' } };
    user.lastLoginAt =
      overrides?.lastLoginAt !== undefined
        ? overrides.lastLoginAt
        : this.lastLoginAt ?? null;

    return user;
  }

  /**
   * UID 설정
   */
  withUid(uid: string): this {
    this.uid = uid;
    return this;
  }

  /**
   * 이메일 설정
   */
  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  /**
   * 이름 설정
   */
  withName(firstName: string, lastName: string): this {
    this.firstName = firstName;
    this.lastName = lastName;
    return this;
  }

  /**
   * 비밀번호 해시 설정
   */
  withPasswordHash(passwordHash: string): this {
    this.passwordHash = passwordHash;
    return this;
  }

  /**
   * 이미지 경로 설정
   */
  withImage(imagePath: string): this {
    this.imagePath = imagePath;
    return this;
  }

  /**
   * 테마 설정
   */
  withTheme(mode: ThemeMode): this {
    this.settings = { theme: { mode } };
    return this;
  }

  /**
   * 마지막 로그인 시간 설정
   */
  withLastLogin(lastLoginAt: Date = new Date()): this {
    this.lastLoginAt = lastLoginAt;
    return this;
  }

  /**
   * 특정 이메일 도메인 설정
   */
  withEmailDomain(domain: string): this {
    const seq = testSequence.next('user');
    this.email = `test${seq}@${domain}`;
    return this;
  }

  /**
   * 활성 사용자로 설정
   */
  asActive(): this {
    this.isActive = true;
    return this;
  }

  /**
   * 비활성 사용자로 설정
   */
  asInactive(): this {
    this.isActive = false;
    return this;
  }

  // ============================================================
  // 레거시 호환성을 위한 정적 메서드
  // ============================================================

  /**
   * @deprecated 인스턴스 기반 API 사용 권장: `new UserFactory(em).create()`
   */
  static create(overrides: Partial<User> = {}): User {
    const factory = new UserFactory({} as any);
    return factory.build(overrides);
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    const factory = new UserFactory({} as any);
    return Array.from({ length: count }, () => factory.build(overrides));
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createActive(overrides: Partial<User> = {}): User {
    return this.create({ ...overrides, isActive: true });
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createInactive(overrides: Partial<User> = {}): User {
    return this.create({ ...overrides, isActive: false });
  }
}
