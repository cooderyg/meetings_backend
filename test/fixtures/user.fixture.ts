import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../../src/domain/user/entity/user.entity';

/**
 * 테스트용 User 생성
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

  user.uid = overrides.uid ?? `test-uid-${timestamp}`;
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
 */
export async function createUserListFixture(
  em: EntityManager,
  count: number = 3
): Promise<User[]> {
  const timestamp = Date.now();
  const users = Array.from({ length: count }, (_, i) => {
    const user = new User();
    user.uid = `test-uid-${timestamp}-${i}`;
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
