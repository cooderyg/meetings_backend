import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

/**
 * 테스트 DB 초기화
 * - 스키마 생성 (테이블, 인덱스, 제약조건)
 * - ltree 확장 활성화 (Resource path 필드용)
 */
export async function initializeTestDatabase(orm: MikroORM): Promise<void> {
  const generator = orm.getSchemaGenerator();
  await generator.ensureDatabase();

  // Enable ltree extension for Resource path field
  const em = orm.em.fork() as EntityManager;
  await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

  // Drop existing schema to avoid conflicts in parallel test execution
  try {
    await generator.dropSchema();
  } catch (error) {
    // Ignore if schema doesn't exist
  }

  await generator.createSchema();
}

/**
 * 테스트 DB 정리
 * - 스키마 삭제
 */
export async function cleanupTestDatabase(orm: MikroORM): Promise<void> {
  const generator = orm.getSchemaGenerator();
  await generator.dropSchema();
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
