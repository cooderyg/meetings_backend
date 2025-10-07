import { MikroORM, EntityManager } from '@mikro-orm/core';
import { createWorkerSchema, dropWorkerSchema } from './test-db-manager';
import { Role } from '../../src/domain/role/entity/role.entity';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';

/**
 * 테스트 DB 초기화 (워커별 스키마 격리)
 * - 워커 전용 스키마 생성
 * - 해당 스키마 내에 테이블 생성
 * - ltree 확장은 global-setup.ts에서 이미 활성화됨
 * - 시스템 Role 생성
 */
export async function initializeTestDatabase(orm: MikroORM): Promise<void> {
  const generator = orm.getSchemaGenerator();

  // 데이터베이스가 존재하는지 확인 (global-setup에서 이미 생성했지만 안전성 확보)
  await generator.ensureDatabase();

  // 워커 전용 스키마 생성 (예: test_schema_1, test_schema_2)
  await createWorkerSchema(orm as any);

  // 워커 스키마 내에 테이블 생성 (다른 워커와 충돌 없음)
  await generator.createSchema();

  // 시스템 Role 생성 (E2E 테스트 필수 데이터)
  await createSystemRoles(orm.em);
}

/**
 * 시스템 Role 생성 헬퍼
 */
async function createSystemRoles(em: EntityManager): Promise<void> {
  const systemRoles = [
    Role.createSystemRole(
      SystemRole.OWNER,
      'Workspace owner with full control'
    ),
    Role.createSystemRole(
      SystemRole.ADMIN,
      'Administrator with management permissions'
    ),
    Role.createSystemRole(SystemRole.FULL_EDIT, 'Full editing permissions'),
    Role.createSystemRole(SystemRole.CAN_EDIT, 'Can edit content'),
    Role.createSystemRole(SystemRole.CAN_VIEW, 'View-only access'),
  ];

  for (const role of systemRoles) {
    em.persist(role);
  }

  await em.flush();
}

/**
 * 테스트 DB 정리 (워커별 스키마 격리)
 * - 워커 전용 스키마 삭제 (CASCADE로 모든 테이블 함께 삭제)
 */
export async function cleanupTestDatabase(orm: MikroORM): Promise<void> {
  // 워커 전용 스키마 삭제 (다른 워커와 충돌 없음)
  await dropWorkerSchema(orm as any);
}

/**
 * 트랜잭션 시작 헬퍼
 *
 * @example
 * beforeEach(async () => {
 *   await startTransaction(em);
 * });
 */
export async function startTransaction(em: EntityManager): Promise<void> {
  await em.begin();
}

/**
 * 트랜잭션 롤백 헬퍼 (데이터 정리)
 *
 * @example
 * afterEach(async () => {
 *   await rollbackTransaction(em);
 * });
 */
export async function rollbackTransaction(em: EntityManager): Promise<void> {
  try {
    await em.rollback();
  } catch (error) {
    // 이미 롤백된 경우 무시
  }
}

/**
 * 테스트용 트랜잭션 래퍼
 * - 각 테스트를 트랜잭션으로 감싸서 자동 롤백
 *
 * @example
 * it('should create meeting', () =>
 *   withTransaction(em, async () => {
 *     const meeting = await service.createMeeting({...});
 *     expect(meeting).toBeDefined();
 *   })
 * );
 */
export async function withTransaction<T>(
  em: EntityManager,
  fn: () => Promise<T>
): Promise<T> {
  await em.begin();
  try {
    const result = await fn();
    await em.rollback();
    return result;
  } catch (error) {
    await em.rollback();
    throw error;
  }
}

/**
 * 테스트 DB 헬퍼 인터페이스
 */
export interface DbHelpers {
  setUp: () => Promise<void>;
  tearDown: () => Promise<void>;
}

/**
 * 테스트 DB 헬퍼 생성
 *
 * @example
 * const dbHelpers = createDbHelpers(em);
 * beforeEach(async () => {
 *   await dbHelpers.setUp();
 * });
 * afterEach(async () => {
 *   await dbHelpers.tearDown();
 * });
 */
export function createDbHelpers(em: EntityManager): DbHelpers {
  return {
    setUp: async () => {
      await startTransaction(em);
    },
    tearDown: async () => {
      await rollbackTransaction(em);
    },
  };
}
