import { MikroORM, EntityManager } from '@mikro-orm/core';
import { createWorkerSchema, dropWorkerSchema } from './test-db-manager';
import { Role } from '../../src/domain/role/entity/role.entity';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';
import {
  Permission,
  Action,
  ResourceSubject,
} from '../../src/domain/permission/entity/permission.entity';
import { RolePermission } from '../../src/domain/permission/entity/role-permission.entity';
import { SYSTEM_ROLE_PERMISSIONS } from '../../src/domain/role/const/system-role-permissions.const';

/**
 * 테스트 DB 초기화 (워커별 스키마 격리)
 *
 * @description
 * Jest 병렬 워커 간 데이터 충돌을 방지하기 위해 워커별 독립 스키마를 생성합니다.
 * - 워커별 스키마 생성 (예: test_schema_1, test_schema_2)
 * - 스키마 내 테이블 생성
 * - 시스템 Role 초기 데이터 생성 (E2E 테스트 필수)
 *
 * @param orm - MikroORM 인스턴스
 *
 * @remarks
 * - ltree 확장은 global-setup.ts에서 public 스키마에 이미 활성화됨
 * - 각 워커는 독립된 스키마를 사용하므로 데이터 간섭 없음
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   const testModule = await TestModuleBuilder.create()
 *     .withModule(MeetingModule)
 *     .build();
 *
 *   orm = testModule.get<MikroORM>(MikroORM);
 *   await initializeTestDatabase(orm); // ✅ 워커 스키마 생성 및 초기화
 * });
 * ```
 */
export async function initializeTestDatabase(orm: MikroORM): Promise<void> {
  const generator = orm.getSchemaGenerator();

  // 데이터베이스가 존재하는지 확인 (global-setup에서 이미 생성했지만 안전성 확보)
  await generator.ensureDatabase();

  // 워커 전용 스키마 생성 (예: test_schema_1, test_schema_2)
  await createWorkerSchema(orm as any);

  // 워커 스키마 내에 테이블 생성 (다른 워커와 충돌 없음)
  await generator.createSchema();

  // 권한 시스템 초기화 (순서 중요)
  await createPermissions(orm.em); // 1. Permission 먼저 생성
  await createSystemRoles(orm.em); // 2. Role 생성
  await createRolePermissions(orm.em); // 3. RolePermission 매핑
}

/**
 * Permission 엔티티 생성 헬퍼
 *
 * @description
 * 권한 시스템에 필요한 모든 Permission 조합을 생성합니다.
 * Action × ResourceSubject 조합으로 Permission 엔티티를 생성합니다.
 */
async function createPermissions(em: EntityManager): Promise<void> {
  // SYSTEM_ROLE_PERMISSIONS에서 사용되는 모든 Permission 추출
  const permissionsToCreate = new Set<string>();

  for (const permissionRules of Object.values(SYSTEM_ROLE_PERMISSIONS)) {
    for (const rule of permissionRules) {
      permissionsToCreate.add(`${rule.action}:${rule.subject}`);
    }
  }

  // Permission 엔티티 생성
  for (const permKey of permissionsToCreate) {
    const [action, subject] = permKey.split(':') as [Action, ResourceSubject];
    const permission = new Permission();
    permission.action = action;
    permission.resourceSubject = subject;
    em.persist(permission);
  }

  await em.flush();
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
 * RolePermission 매핑 생성 헬퍼
 *
 * @description
 * SYSTEM_ROLE_PERMISSIONS 상수를 기반으로 Role과 Permission을 연결합니다.
 * 각 SystemRole에 해당하는 Permission을 RolePermission 테이블에 매핑합니다.
 */
async function createRolePermissions(em: EntityManager): Promise<void> {
  for (const [roleName, permissionRules] of Object.entries(
    SYSTEM_ROLE_PERMISSIONS
  )) {
    const role = await em.findOne(Role, {
      name: roleName,
      workspace: null,
    });

    if (!role) {
      console.warn(`System role not found: ${roleName}`);
      continue;
    }

    for (const rule of permissionRules) {
      const permission = await em.findOne(Permission, {
        action: rule.action,
        resourceSubject: rule.subject,
      });

      if (!permission) {
        console.warn(
          `Permission not found: ${rule.action}:${rule.subject}`
        );
        continue;
      }

      const rolePermission = new RolePermission();
      rolePermission.role = role;
      rolePermission.permission = permission;
      em.persist(rolePermission);
    }
  }

  await em.flush();
}

/**
 * Permission 시스템 초기화 (Integration 테스트용)
 *
 * @description
 * Testcontainer를 사용하는 Integration 테스트에서 스키마 생성 후
 * Permission, Role, RolePermission 데이터만 초기화합니다.
 *
 * @param em - MikroORM EntityManager
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   // ... TestModuleBuilder로 모듈 생성 ...
 *   await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');
 *   const generator = orm.getSchemaGenerator();
 *   await generator.createSchema({ wrap: false });
 *
 *   await initializePermissionData(em); // ✅ Permission 데이터 초기화
 * });
 * ```
 */
export async function initializePermissionData(
  em: EntityManager
): Promise<void> {
  await createPermissions(em); // 1. Permission 먼저 생성
  await createSystemRoles(em); // 2. Role 생성
  await createRolePermissions(em); // 3. RolePermission 매핑
}

/**
 * 테스트 DB 정리 (워커별 스키마 삭제)
 *
 * @description
 * 테스트 종료 시 워커별 스키마를 삭제하여 DB를 정리합니다.
 * - CASCADE 옵션으로 스키마 내 모든 테이블 자동 삭제
 * - 다른 워커의 스키마는 영향받지 않음
 *
 * @param orm - MikroORM 인스턴스
 *
 * @example
 * ```typescript
 * afterAll(async () => {
 *   await cleanupTestDatabase(orm); // ✅ 워커 스키마 삭제
 *   await app.close();
 *   await orm.close();
 * });
 * ```
 */
export async function cleanupTestDatabase(orm: MikroORM): Promise<void> {
  // 워커 전용 스키마 삭제 (다른 워커와 충돌 없음)
  await dropWorkerSchema(orm as any);
}

