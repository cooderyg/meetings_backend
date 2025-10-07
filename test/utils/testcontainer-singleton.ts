import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { AppConfig } from '../../src/shared/module/app-config/app-config';
import { createTestDatabaseConfig } from '../config/test-db.config';

/**
 * Testcontainer 싱글톤 매니저
 * - 테스트 성능 최적화를 위해 컨테이너 재사용
 * - 각 테스트 스위트별로 격리된 데이터베이스 제공
 */
export class TestContainerManager {
  private static instance: TestContainerManager;
  private containers: Map<string, StartedPostgreSqlContainer> = new Map();
  private orms: Map<string, MikroORM> = new Map();

  private constructor() {}

  static getInstance(): TestContainerManager {
    if (!this.instance) {
      this.instance = new TestContainerManager();
    }
    return this.instance;
  }

  /**
   * PostgreSQL 컨테이너 가져오기 (없으면 생성)
   */
  async getPostgresContainer(
    key: string = 'default'
  ): Promise<StartedPostgreSqlContainer> {
    if (!this.containers.has(key)) {
      console.log(`🐳 Starting PostgreSQL container for: ${key}`);

      const container = await new PostgreSqlContainer('postgres:16')
        .withDatabase(`test_${key.replace(/-/g, '_')}`)
        .withUsername('test_user')
        .withPassword('test_password')
        .withTmpFs({ '/var/lib/postgresql/data': 'rw' }) // 메모리 DB로 성능 향상
        .withReuse() // 개발 시 컨테이너 재사용 (CI에서는 비활성화)
        .start();

      this.containers.set(key, container);

      console.log(
        `✅ PostgreSQL container started on port: ${container.getMappedPort(5432)}`
      );
    }

    return this.containers.get(key)!;
  }

  /**
   * 컨테이너와 연결된 MikroORM 인스턴스 가져오기
   */
  async getOrm(key: string = 'default'): Promise<MikroORM> {
    if (!this.orms.has(key)) {
      const container = await this.getPostgresContainer(key);
      const appConfig = new AppConfig();

      // 컨테이너 연결 정보로 설정 오버라이드
      const config = createTestDatabaseConfig(appConfig);
      config.clientUrl = container.getConnectionUri();

      const orm = await MikroORM.init(config);

      // 스키마 생성
      const generator = orm.getSchemaGenerator();
      await generator.createSchema();

      this.orms.set(key, orm);
    }

    return this.orms.get(key)!;
  }

  /**
   * 특정 컨테이너/ORM 정리
   */
  async cleanup(key: string): Promise<void> {
    const orm = this.orms.get(key);
    if (orm) {
      await orm.close(true);
      this.orms.delete(key);
    }

    const container = this.containers.get(key);
    if (container) {
      await container.stop();
      this.containers.delete(key);
    }
  }

  /**
   * 모든 컨테이너 정리
   */
  async cleanupAll(): Promise<void> {
    console.log('🧹 Cleaning up all test containers...');

    // ORM 먼저 정리
    for (const orm of this.orms.values()) {
      await orm.close(true);
    }
    this.orms.clear();

    // 컨테이너 정리
    for (const container of this.containers.values()) {
      await container.stop();
    }
    this.containers.clear();

    console.log('✅ All test containers cleaned up');
  }

  /**
   * 개발 환경에서 컨테이너 재사용 활성화
   */
  enableReuse(): void {
    if (process.env.CI !== 'true') {
      process.env.TESTCONTAINERS_REUSE_ENABLE = 'true';
    }
  }
}
