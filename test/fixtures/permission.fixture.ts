import { EntityManager } from '@mikro-orm/postgresql';
import { MemberResourcePermission } from '../../src/domain/permission/entity/member-resource-permission.entity';
import { Permission, Action, ResourceSubject } from '../../src/domain/permission/entity/permission.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';

/**
 * 테스트용 MemberResourcePermission 생성
 *
 * @description
 * Individual Resource Permission을 생성하고 DB에 저장합니다.
 * 특정 멤버에게 특정 리소스 경로에 대한 명시적 권한을 부여/거부합니다.
 *
 * @param em - MikroORM EntityManager
 * @param options - MemberResourcePermission 생성 옵션
 * @returns DB에 저장된 MemberResourcePermission 엔티티
 *
 * @default isAllowed - true (권한 허용)
 * @default expiresAt - null (만료 없음)
 *
 * @example
 * // 기본값: 권한 허용, 만료 없음
 * const permission = await createMemberResourcePermissionFixture(em, {
 *   workspaceMember: member,
 *   workspace,
 *   action: Action.READ,
 *   resourceSubject: ResourceSubject.SPACE,
 *   resourcePath: 'root.space1',
 * });
 *
 * @example
 * // 명시적 거부 권한
 * const denyPermission = await createMemberResourcePermissionFixture(em, {
 *   workspaceMember: member,
 *   workspace,
 *   action: Action.UPDATE,
 *   resourceSubject: ResourceSubject.MEETING,
 *   resourcePath: 'root.meeting1',
 *   isAllowed: false,
 * });
 *
 * @example
 * // 만료 시간이 있는 권한
 * const tempPermission = await createMemberResourcePermissionFixture(em, {
 *   workspaceMember: member,
 *   workspace,
 *   action: Action.READ,
 *   resourceSubject: ResourceSubject.SPACE,
 *   resourcePath: 'root.space1',
 *   expiresAt: new Date(Date.now() + 3600000), // 1시간 후 만료
 * });
 */
export async function createMemberResourcePermissionFixture(
  em: EntityManager,
  options: {
    workspaceMember: WorkspaceMember;
    workspace: Workspace;
    action: Action;
    resourceSubject: ResourceSubject;
    resourcePath: string;
    isAllowed?: boolean;
    expiresAt?: Date | null;
  }
): Promise<MemberResourcePermission> {
  // Permission 엔티티 조회 또는 생성
  let permission = await em.findOne(Permission, {
    action: options.action,
    resourceSubject: options.resourceSubject,
  });

  if (!permission) {
    // Permission이 없으면 새로 생성 (테스트 환경에서만)
    permission = new Permission();
    permission.action = options.action;
    permission.resourceSubject = options.resourceSubject;
    await em.persistAndFlush(permission);
  }

  // MemberResourcePermission 생성
  const memberResourcePermission = new MemberResourcePermission();
  memberResourcePermission.workspaceMember = options.workspaceMember;
  memberResourcePermission.workspace = options.workspace;
  memberResourcePermission.permission = permission;
  memberResourcePermission.resourcePath = options.resourcePath;
  memberResourcePermission.isAllowed = options.isAllowed ?? true;
  memberResourcePermission.expiresAt = options.expiresAt ?? null;

  await em.persistAndFlush(memberResourcePermission);

  return memberResourcePermission;
}

/**
 * 만료된 MemberResourcePermission 생성 (테스트용)
 *
 * @description
 * 이미 만료된 Individual Permission을 생성합니다.
 * 만료 처리 로직 테스트에 사용됩니다.
 *
 * @example
 * const expiredPermission = await createExpiredMemberResourcePermissionFixture(em, {
 *   workspaceMember: member,
 *   workspace,
 *   action: Action.READ,
 *   resourceSubject: ResourceSubject.SPACE,
 *   resourcePath: 'root.space1',
 * });
 *
 * expect(expiredPermission.isExpired()).toBe(true);
 * expect(expiredPermission.isActive()).toBe(false);
 */
export async function createExpiredMemberResourcePermissionFixture(
  em: EntityManager,
  options: {
    workspaceMember: WorkspaceMember;
    workspace: Workspace;
    action: Action;
    resourceSubject: ResourceSubject;
    resourcePath: string;
  }
): Promise<MemberResourcePermission> {
  // 1시간 전에 만료된 권한 생성
  const expiredDate = new Date(Date.now() - 3600000);

  return createMemberResourcePermissionFixture(em, {
    ...options,
    expiresAt: expiredDate,
  });
}

/**
 * 거부(DENY) MemberResourcePermission 생성 (테스트용)
 *
 * @description
 * isAllowed=false로 설정된 명시적 거부 권한을 생성합니다.
 * Role 권한보다 우선하는 명시적 거부 테스트에 사용됩니다.
 *
 * @example
 * const denyPermission = await createDenyMemberResourcePermissionFixture(em, {
 *   workspaceMember: member,
 *   workspace,
 *   action: Action.UPDATE,
 *   resourceSubject: ResourceSubject.MEETING,
 *   resourcePath: 'root.meeting1',
 * });
 *
 * expect(denyPermission.isAllowed).toBe(false);
 * expect(denyPermission.isDenied()).toBe(true);
 */
export async function createDenyMemberResourcePermissionFixture(
  em: EntityManager,
  options: {
    workspaceMember: WorkspaceMember;
    workspace: Workspace;
    action: Action;
    resourceSubject: ResourceSubject;
    resourcePath: string;
  }
): Promise<MemberResourcePermission> {
  return createMemberResourcePermissionFixture(em, {
    ...options,
    isAllowed: false,
  });
}
