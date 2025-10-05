import { MikroORM } from '@mikro-orm/core';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppConfig } from '../src/shared/module/app-config/app-config';
import { createTestDatabaseConfig } from './config/test-db.config';

/**
 * Jest 전역 Teardown
 * - 모든 테스트 완료 후 한 번만 실행
 * - 데이터베이스 스키마 삭제
 */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up test database...');

  // 환경 변수 로드 (global setup/teardown에서는 setupFiles가 적용되지 않음)
  config({ path: resolve(__dirname, '../.env.test') });

  const appConfig = new AppConfig();
  const orm = await MikroORM.init(createTestDatabaseConfig(appConfig));

  const generator = orm.getSchemaGenerator();
  await generator.dropSchema();

  await orm.close();

  console.log('✅ Test database cleaned up');
}
