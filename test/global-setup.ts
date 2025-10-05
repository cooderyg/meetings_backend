import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { config } from 'dotenv';
import { resolve } from 'path';
import { AppConfig } from '../src/shared/module/app-config/app-config';
import { createTestDatabaseConfig } from './config/test-db.config';

/**
 * Jest 전역 Setup
 * - 모든 테스트 실행 전 한 번만 실행
 * - 데이터베이스 스키마 생성
 */
export default async function globalSetup() {
  console.log('🔧 Setting up test database schema...');

  // 환경 변수 로드 (global setup/teardown에서는 setupFiles가 적용되지 않음)
  config({ path: resolve(__dirname, '../.env.test') });

  // AppConfig 초기화
  const appConfig = new AppConfig();

  // MikroORM 초기화
  const orm = await MikroORM.init(createTestDatabaseConfig(appConfig));

  const generator = orm.getSchemaGenerator();
  await generator.ensureDatabase();

  // Enable ltree extension
  const em = orm.em.fork() as EntityManager;
  await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

  // Drop and recreate schema
  try {
    await generator.dropSchema();
  } catch (error) {
    // Ignore if schema doesn't exist
  }

  await generator.createSchema();

  await orm.close();

  console.log('✅ Test database schema ready');
}
