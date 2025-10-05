import { Options } from '@mikro-orm/core';
import { defineConfig } from '@mikro-orm/postgresql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppConfig } from '../../src/shared/module/app-config/app-config';

// 명시적 엔티티 import (glob 검색 제거로 성능 향상)
import { LoginEvent } from '../../src/domain/auth/entity/login-event.entity';
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
 * - 각 테스트 전 스키마 생성, 후 삭제
 * - 성능 최적화: 명시적 엔티티 import, reflect-metadata 사용
 */
export function createTestDatabaseConfig(appConfig: AppConfig): Options {
  return {
    // 명시적 엔티티 배열 (glob 검색 제거)
    entities: [
      LoginEvent,
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

    // 성능 최적화
    debug: false,

    // 테스트에서 global EntityManager 사용 허용
    allowGlobalContext: true,

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
