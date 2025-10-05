import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppConfig } from '../src/shared/module/app-config/app-config';
import { createTestDatabaseConfig } from './config/test-db.config';

/**
 * Jest 전역 Setup
 * - 모든 테스트 실행 전 한 번만 실행
 * - 테스트 데이터베이스 준비 (스키마 생성은 각 워커에서 담당)
 */
export default async function globalSetup() {
  console.log('🔧 Setting up test database...');

  // 환경 변수 로드 (global setup/teardown에서는 setupFiles가 적용되지 않음)
  config({ path: resolve(__dirname, '../.env.test') });

  // AppConfig 초기화
  const appConfig = new AppConfig();

  // MikroORM 초기화
  const orm = await MikroORM.init(createTestDatabaseConfig(appConfig));

  const generator = orm.getSchemaGenerator();

  // 테스트 데이터베이스가 존재하는지 확인하고, 없으면 생성
  await generator.ensureDatabase();

  // Enable ltree extension (전역 익스텐션)
  const em = orm.em.fork() as EntityManager;
  await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

  // 스키마 생성은 각 워커의 beforeAll에서 담당
  // 이를 통해 워커별 독립적인 스키마 격리 달성

  await orm.close();

  console.log('✅ Test database ready');
}
