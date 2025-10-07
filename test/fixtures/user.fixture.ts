import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../../src/domain/user/entity/user.entity';
import { v4 as uuid } from 'uuid';

/**
 * 테스트용 User 생성
 *
 * @description
 * User 엔티티를 생성하고 DB에 저장합니다.
 * overrides로 특정 필드만 커스텀 설정 가능하며, 나머지는 테스트용 기본값 사용.
 *
 * @param em - MikroORM EntityManager
 * @param overrides - User 필드 일부 오버라이드 (선택)
 * @returns DB에 저장된 User 엔티티
 *
 * @default uid - 'test-uid-{uuid}' (UUID로 고유성 보장)
 * @default email - 'test{timestamp}@example.com'
 * @default firstName - 'Test'
 * @default lastName - 'User'
 * @default passwordHash - 'hashed-password'
 * @default settings - { theme: { mode: 'light' } }
 * @default isActive - true
 *
 * @example
 * // 기본값으로 생성 (firstName='Test', lastName='User')
 * const user = await createUserFixture(em);
 *
 * @example
 * // 특정 필드만 커스텀 설정
 * const user = await createUserFixture(em, {
 *   firstName: '길동',
 *   lastName: '홍',
 *   email: 'hong@example.com'
 * });
 *
 * @example
 * // expect에서 기본값 사용 시 주의
 * const user = await createUserFixture(em);
 * expect(user.firstName).toBe('Test'); // ✅ 기본값 확인
 */
export async function createUserFixture(
  em: EntityManager,
  overrides: Partial<User> = {}
): Promise<User> {
  const timestamp = Date.now();
  const user = new User();

  // id가 제공되면 명시적으로 설정
  if (overrides.id) {
    (user as any).id = overrides.id;
  }

  user.uid = overrides.uid ?? `test-uid-${uuid()}`;
  user.email = overrides.email ?? `test${timestamp}@example.com`;
  user.firstName = overrides.firstName ?? 'Test';
  user.lastName = overrides.lastName ?? 'User';
  user.passwordHash = overrides.passwordHash ?? 'hashed-password';
  user.settings = overrides.settings ?? {
    theme: { mode: 'light' },
  };
  user.isActive = overrides.isActive ?? true;

  await em.persistAndFlush(user);
  return user;
}

/**
 * 여러 User 한 번에 생성
 *
 * @description
 * 지정한 개수만큼 User 엔티티를 생성하고 DB에 저장합니다.
 * 각 User는 고유한 email과 firstName을 가집니다.
 *
 * @param em - MikroORM EntityManager
 * @param count - 생성할 User 개수 (기본값: 3)
 * @returns DB에 저장된 User 엔티티 배열
 *
 * @default 각 User의 firstName - 'Test0', 'Test1', 'Test2', ...
 * @default 각 User의 lastName - 'User'
 * @default 각 User의 email - 'test{timestamp}-{index}@example.com'
 *
 * @example
 * // 3명의 User 생성
 * const users = await createUserListFixture(em);
 * expect(users).toHaveLength(3);
 * expect(users[0].firstName).toBe('Test0');
 * expect(users[1].firstName).toBe('Test1');
 *
 * @example
 * // 10명의 User 생성
 * const users = await createUserListFixture(em, 10);
 */
export async function createUserListFixture(
  em: EntityManager,
  count: number = 3
): Promise<User[]> {
  const timestamp = Date.now();
  const users = Array.from({ length: count }, (_, i) => {
    const user = new User();
    user.uid = `test-uid-${uuid()}`;
    user.email = `test${timestamp}-${i}@example.com`;
    user.firstName = `Test${i}`;
    user.lastName = 'User';
    user.passwordHash = 'hashed-password';
    user.settings = {
      theme: { mode: 'light' },
    };
    user.isActive = true;
    return user;
  });

  await em.persistAndFlush(users);
  return users;
}
