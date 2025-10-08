import { Options } from '@mikro-orm/core';
import { defineConfig } from '@mikro-orm/postgresql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppConfig } from '../../src/shared/module/app-config/app-config';
import { getWorkerSchemaName } from '../utils/test-db-manager';

// 명시적 엔티티 import (glob 검색 제거로 성능 향상)
import { LoginEvent } from '../../src/domain/auth/entity/login-event.entity';
import { Invitation } from '../../src/domain/invitation/entity/invitation.entity';
import { MeetingParticipant } from '../../src/domain/meeting-participant/entity/meeting-participant.entity';
import { MeetingRecord } from '../../src/domain/meeting-record/entity/meeting-record.entity';
import { Meeting } from '../../src/domain/meeting/entity/meeting.entity';
import { MemberResourcePermission } from '../../src/domain/permission/entity/member-resource-permission.entity';
import { Permission } from '../../src/domain/permission/entity/permission.entity';
import { RolePermission } from '../../src/domain/permission/entity/role-permission.entity';
import { Resource } from '../../src/domain/resource/entity/resource.entity';
import { Role } from '../../src/domain/role/entity/role.entity';
import { Space } from '../../src/domain/space/entity/space.entity';
import { User } from '../../src/domain/user/entity/user.entity';
import { WorkspaceMemberRole } from '../../src/domain/workspace-member-role/entity/workspace-member-role.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';

/**
 * 테스트 DB 설정
 * - Schema Generator 사용 (마이그레이션 불필요)
 * - 워커별 독립 스키마 격리 (병렬 테스트 안정성)
 * - 성능 최적화: 명시적 엔티티 import, reflect-metadata 사용
 */
export function createTestDatabaseConfig(appConfig: AppConfig): Options {
  // 워커별 고유 스키마 이름 (병렬 테스트 격리)
  let schema: string | undefined;
  try {
    schema = getWorkerSchemaName();
  } catch (error) {
    // JEST_WORKER_ID가 없는 경우 (global-setup/teardown)
    // 스키마를 지정하지 않음 (기본 public 스키마 사용)
    schema = undefined;
  }

  return {
    // 명시적 엔티티 배열 (glob 검색 제거)
    entities: [
      LoginEvent,
      Invitation,
      MeetingParticipant,
      MeetingRecord,
      Meeting,
      MemberResourcePermission,
      Permission,
      RolePermission,
      Resource,
      Role,
      Space,
      User,
      WorkspaceMemberRole,
      WorkspaceMember,
      Workspace,
    ],

    // reflect-metadata 사용 (TsMorph보다 빠름)
    // metadataProvider는 기본값 ReflectMetadataProvider 사용

    // 드라이버 명시 (경고 제거)
    driver: PostgreSqlDriver,

    host: appConfig.database.host,
    port: appConfig.database.port,
    user: appConfig.database.username,
    password: appConfig.database.password,
    dbName: appConfig.database.name,

    // 워커별 스키마 격리
    ...(schema && { schema }),

    // 성능 최적화
    debug: false,

    // 테스트에서 global EntityManager 사용 허용
    allowGlobalContext: true,

    // 트랜잭션 격리 패턴을 위한 설정
    // flush() 시 자동 트랜잭션 생성 비활성화
    implicitTransactions: false,

    // 메타데이터 캐시 활성화
    metadataCache: {
      enabled: true,
      options: { cacheDir: './temp' },
    },

    // discovery 최적화 (속성 분석 최소화)
    discovery: {
      alwaysAnalyseProperties: false,
    },
  };
}
