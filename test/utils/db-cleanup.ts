import { EntityManager } from '@mikro-orm/postgresql';

/**
 * 테스트 DB 정리 유틸리티
 */
export class DbCleanup {
  /**
   * 모든 테이블 데이터 삭제 (트랜잭션 사용)
   */
  static async cleanAllTables(em: EntityManager): Promise<void> {
    await em.transactional(async (em) => {
      // 테이블 순서 중요: 외래 키 제약 조건 고려
      const tables = [
        'meeting_participants',
        'meeting_records',
        'meetings',
        'spaces',
        'resources',
        'workspace_member_roles',
        'role_permissions',
        'permissions',
        'roles',
        'workspace_members',
        'workspaces',
        'users',
      ];

      for (const table of tables) {
        await em.execute(`TRUNCATE TABLE "${table}" CASCADE`);
      }
    });

    // EntityManager 캐시 클리어
    await em.clear();
  }

  /**
   * 특정 테이블들만 정리 (더 빠른 실행을 위해)
   */
  static async cleanTables(em: EntityManager, tables: string[]): Promise<void> {
    if (tables.length === 0) return;

    // 한 번의 쿼리로 모든 테이블 정리
    const tableList = tables.map((t) => `"${t}"`).join(', ');
    await em.execute(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
    await em.clear();
  }

  /**
   * 도메인별 테이블 정리
   */
  static async cleanDomainTables(
    em: EntityManager,
    domain: 'user' | 'workspace' | 'meeting' | 'resource'
  ): Promise<void> {
    const domainTables: Record<string, string[]> = {
      user: ['users'],
      workspace: ['workspace_member_roles', 'workspace_members', 'workspaces'],
      meeting: ['meeting_participants', 'meeting_records', 'meetings'],
      resource: ['resources', 'spaces'],
    };

    const tables = domainTables[domain];
    if (tables) {
      await this.cleanTables(em, tables);
    }
  }

  /**
   * 테스트 전 DB 초기화 (스키마 재생성)
   */
  static async initializeTestDb(em: EntityManager): Promise<void> {
    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // uuid-ossp 확장 설치 (UUID 생성용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  /**
   * 테스트 격리를 위한 임시 스키마 생성
   */
  static async createTestSchema(
    em: EntityManager,
    schemaName: string
  ): Promise<void> {
    await em.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    await em.execute(`SET search_path TO ${schemaName}`);
  }

  /**
   * 임시 스키마 삭제
   */
  static async dropTestSchema(
    em: EntityManager,
    schemaName: string
  ): Promise<void> {
    await em.execute(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  }
}

/**
 * 테스트 헬퍼: beforeEach에서 사용
 */
export async function cleanupBeforeEach(
  em: EntityManager,
  tables?: string[]
): Promise<void> {
  if (tables) {
    await DbCleanup.cleanTables(em, tables);
  } else {
    await DbCleanup.cleanAllTables(em);
  }
}

/**
 * 테스트 헬퍼: beforeAll에서 사용
 */
export async function setupTestDatabase(em: EntityManager): Promise<void> {
  await DbCleanup.initializeTestDb(em);
}
