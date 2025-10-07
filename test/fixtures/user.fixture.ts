import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../../src/domain/user/entity/user.entity';
import { testSequence } from '../utils/sequence-generator';

/**
 * 테스트용 User 생성
 */
export async function createUserFixture(
  em: EntityManager,
  overrides: Partial<User> = {}
): Promise<User> {
  const seq = testSequence.next('user');
  const user = new User();
  user.uid = overrides.uid ?? `test-uid-${seq}`;
  user.email = overrides.email ?? `test${seq}@example.com`;
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
  const users = Array.from({ length: count }, () => {
    const seq = testSequence.next('user');
    const user = new User();
    user.uid = `test-uid-${seq}`;
    user.email = `test${seq}@example.com`;
    user.firstName = 'Test';
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
