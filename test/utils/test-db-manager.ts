import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

/**
 * Jest 워커의 고유 스키마 이름 생성
 * @returns 워커별 스키마 이름 (예: test_schema_1, test_schema_2)
 * @throws JEST_WORKER_ID가 정의되지 않은 경우 에러
 */
export function getWorkerSchemaName(): string {
  const workerId = process.env.JEST_WORKER_ID;
  if (!workerId) {
    throw new Error(
      'JEST_WORKER_ID is not defined. Are you running tests with Jest?'
    );
  }
  return `test_schema_${workerId}`;
}

/**
 * 워커 전용 스키마 생성
 * @param orm MikroORM 인스턴스
 */
export async function createWorkerSchema(
  orm: MikroORM<PostgreSqlDriver>
): Promise<void> {
  const schemaName = getWorkerSchemaName();
  await orm.em.execute(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
}

/**
 * 워커 전용 스키마 삭제 (CASCADE)
 * @param orm MikroORM 인스턴스
 */
export async function dropWorkerSchema(
  orm: MikroORM<PostgreSqlDriver>
): Promise<void> {
  const schemaName = getWorkerSchemaName();
  await orm.em.execute(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
}
