import { EntityManager } from '@mikro-orm/postgresql';
import {
  Meeting,
  MeetingStatus,
} from '../../src/domain/meeting/entity/meeting.entity';
import { Resource } from '../../src/domain/resource/entity/resource.entity';
import {
  ResourceType,
  ResourceVisibility,
} from '../../src/domain/resource/entity/resource.entity';
import { Space } from '../../src/domain/space/entity/space.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { WorkspaceMemberRole } from '../../src/domain/workspace-member-role/entity/workspace-member-role.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { User } from '../../src/domain/user/entity/user.entity';
import { Role } from '../../src/domain/role/entity/role.entity';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';
import { createWorkspaceFixture } from './workspace.fixture';
import { createUserFixture } from './user.fixture';

/**
 * 테스트용 Role 생성 (시스템 Role)
 *
 * @description
 * Role 엔티티를 생성하고 DB에 저장합니다.
 * workspace가 null인 시스템 Role을 생성합니다.
 *
 * @param em - MikroORM EntityManager
 * @param systemRole - 시스템 Role 타입 (기본값: SystemRole.CAN_VIEW)
 * @returns DB에 저장된 Role 엔티티
 *
 * @default systemRole - SystemRole.CAN_VIEW
 * @default description - 'Test {systemRole} role'
 *
 * @example
 * // 기본값 (CAN_VIEW)
 * const role = await createRoleFixture(em);
 *
 * @example
 * // OWNER 권한 Role 생성
 * const ownerRole = await createRoleFixture(em, SystemRole.OWNER);
 */
export async function createRoleFixture(
  em: EntityManager,
  systemRole: SystemRole = SystemRole.CAN_VIEW
): Promise<Role> {
  const role = Role.createSystemRole(systemRole, `Test ${systemRole} role`);

  await em.persistAndFlush(role);
  return role;
}

/**
 * 테스트용 WorkspaceMember 생성
 *
 * @description
 * WorkspaceMember 엔티티를 생성하고 DB에 저장합니다.
 *
 * ⚠️ **경고: 복잡한 캐스케이딩 생성**
 * 이 함수는 미제공 시 자동으로 관련 엔티티를 생성합니다:
 * - Workspace (options.workspace 미제공 시)
 * - User (options.user 미제공 시)
 * - Role (options.role 미제공 시)
 * - WorkspaceMemberRole (항상 자동 생성)
 *
 * 즉, `await createWorkspaceMemberFixture(em)` 호출 시
 * **총 4개 엔티티가 DB에 저장됩니다.**
 *
 * @param em - MikroORM EntityManager
 * @param options - 옵션 객체
 * @param options.workspace - 기존 Workspace (미제공 시 자동 생성)
 * @param options.user - 기존 User (미제공 시 자동 생성)
 * @param options.role - 기존 Role (미제공 시 CAN_VIEW로 자동 생성)
 * @param options.firstName - WorkspaceMember firstName (미제공 시 user.firstName 사용)
 * @param options.lastName - WorkspaceMember lastName (미제공 시 user.lastName 사용)
 * @param options.isActive - 활성화 상태 (기본값: true)
 * @returns DB에 저장된 WorkspaceMember 엔티티
 *
 * @default workspace - createWorkspaceFixture(em) 호출
 * @default user - createUserFixture(em) 호출
 * @default role - createRoleFixture(em) 호출 (SystemRole.CAN_VIEW)
 * @default firstName - user.firstName (= 'Test')
 * @default lastName - user.lastName (= 'User')
 * @default isActive - true
 *
 * @example
 * // ❌ 주의: 4개 엔티티 자동 생성 (Workspace, User, Role, WorkspaceMemberRole)
 * const member = await createWorkspaceMemberFixture(em);
 * expect(member.firstName).toBe('Test'); // user.firstName의 기본값
 *
 * @example
 * // ✅ 권장: 관계를 명시적으로 설정
 * const workspace = await createWorkspaceFixture(em);
 * const user = await createUserFixture(em, { firstName: '길동' });
 * const role = await createRoleFixture(em, SystemRole.OWNER);
 * const member = await createWorkspaceMemberFixture(em, {
 *   workspace,
 *   user,
 *   role,
 *   firstName: user.firstName, // 명시적으로 설정
 * });
 * expect(member.firstName).toBe('길동');
 *
 * @example
 * // WorkspaceMember의 firstName이 User와 다를 수 있음
 * const user = await createUserFixture(em, { firstName: 'John' });
 * const member = await createWorkspaceMemberFixture(em, {
 *   user,
 *   firstName: '홍', // User와 다른 이름 사용
 * });
 * expect(user.firstName).toBe('John');
 * expect(member.firstName).toBe('홍'); // 다른 값 가능
 */
export async function createWorkspaceMemberFixture(
  em: EntityManager,
  options: {
    workspace?: Workspace;
    user?: User;
    role?: Role;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  } = {}
): Promise<WorkspaceMember> {
  const workspace = options.workspace ?? (await createWorkspaceFixture(em));
  const user = options.user ?? (await createUserFixture(em));
  const role = options.role ?? (await createRoleFixture(em));

  const workspaceMember = new WorkspaceMember();
  workspaceMember.workspace = workspace;
  workspaceMember.user = user;
  workspaceMember.firstName = options.firstName ?? user.firstName;
  workspaceMember.lastName = options.lastName ?? user.lastName;
  workspaceMember.isActive = options.isActive ?? true;

  await em.persistAndFlush(workspaceMember);

  // Create WorkspaceMemberRole separately
  const workspaceMemberRole = new WorkspaceMemberRole();
  workspaceMemberRole.workspaceMember = workspaceMember;
  workspaceMemberRole.role = role;

  await em.persistAndFlush(workspaceMemberRole);

  return workspaceMember;
}

/**
 * WorkspaceMember + 기본 관계 엔티티 모두 자동 생성
 *
 * @description
 * WorkspaceMember와 관련된 모든 엔티티를 기본값으로 자동 생성합니다.
 * 이 함수는 **명시적으로 "자동 생성"을 의도할 때만 사용**하세요.
 *
 * **자동 생성되는 엔티티 (총 4개):**
 * 1. Workspace (name: 'Test Workspace {timestamp}', tier: FREE)
 * 2. User (firstName: 'Test', lastName: 'User')
 * 3. Role (SystemRole.CAN_VIEW)
 * 4. WorkspaceMemberRole
 *
 * @param em - MikroORM EntityManager
 * @param overrides - WorkspaceMember 필드 일부 오버라이드 (선택)
 * @returns DB에 저장된 WorkspaceMember 엔티티
 *
 * @example
 * // ✅ 빠른 테스트 데이터 생성 (기본값으로 충분한 경우)
 * const member = await createWorkspaceMemberWithDefaultRelations(em);
 * expect(member.firstName).toBe('Test'); // User의 기본값 사용
 *
 * @example
 * // ✅ 일부 필드만 커스텀 (관계는 자동 생성)
 * const member = await createWorkspaceMemberWithDefaultRelations(em, {
 *   firstName: '길동',
 *   lastName: '홍',
 * });
 *
 * @see {@link createWorkspaceMemberFixture} 관계를 명시적으로 설정할 때 사용
 */
export async function createWorkspaceMemberWithDefaultRelations(
  em: EntityManager,
  overrides: {
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  } = {}
): Promise<WorkspaceMember> {
  // 모든 관계를 자동 생성 (명시적으로 undefined 전달)
  return createWorkspaceMemberFixture(em, {
    workspace: undefined,
    user: undefined,
    role: undefined,
    ...overrides,
  });
}

/**
 * 테스트용 Resource 생성
 *
 * @description
 * Resource 엔티티를 생성하고 DB에 저장합니다.
 *
 * ⚠️ **경고: 캐스케이딩 생성**
 * - Workspace (미제공 시 자동 생성)
 * - WorkspaceMember (미제공 시 자동 생성)
 *   - 그리고 WorkspaceMember가 User, Role, WorkspaceMemberRole도 자동 생성
 *
 * 즉, `await createResourceFixture(em)` 호출 시
 * **최대 5개 엔티티가 DB에 저장될 수 있습니다.**
 *
 * @param em - MikroORM EntityManager
 * @param options - 옵션 객체
 * @returns DB에 저장된 Resource 엔티티
 *
 * @default type - ResourceType.MEETING
 * @default title - 'Test Resource'
 * @default visibility - ResourceVisibility.PUBLIC
 *
 * @example
 * // ✅ 권장: 관계를 명시적으로 설정
 * const workspace = await createWorkspaceFixture(em);
 * const owner = await createWorkspaceMemberFixture(em, { workspace });
 * const resource = await createResourceFixture(em, {
 *   workspace,
 *   owner,
 *   type: ResourceType.MEETING,
 *   title: 'My Meeting'
 * });
 */
export async function createResourceFixture(
  em: EntityManager,
  options: {
    workspace?: Workspace;
    owner?: WorkspaceMember;
    type?: ResourceType;
    title?: string;
  } = {}
): Promise<Resource> {
  const workspace = options.workspace ?? (await createWorkspaceFixture(em));
  const owner =
    options.owner ?? (await createWorkspaceMemberFixture(em, { workspace }));

  const resource = new Resource();
  resource.workspace = workspace;
  resource.owner = owner;
  resource.type = options.type ?? ResourceType.MEETING;
  resource.title = options.title ?? 'Test Resource';
  resource.visibility = ResourceVisibility.PUBLIC;
  resource.path = `${Date.now()}`;

  await em.persistAndFlush(resource);
  return resource;
}

/**
 * 테스트용 Meeting 생성 (Resource 포함)
 *
 * @description
 * Meeting 엔티티를 생성하고 DB에 저장합니다.
 *
 * ⚠️ **경고: 매우 복잡한 캐스케이딩 생성**
 * - Workspace (미제공 시 자동 생성)
 * - Resource (미제공 시 자동 생성)
 *   - Resource 생성 시 Workspace, WorkspaceMember (+ User, Role, WorkspaceMemberRole) 자동 생성
 *
 * 즉, `await createMeetingFixture(em)` 호출 시
 * **최대 6개 엔티티가 DB에 저장될 수 있습니다.**
 *
 * @param em - MikroORM EntityManager
 * @param options - 옵션 객체
 * @returns DB에 저장된 Meeting 엔티티
 *
 * @default status - MeetingStatus.DRAFT
 * @default memo - null
 * @default summary - null
 * @default tags - []
 *
 * @example
 * // ⚠️ 주의: 6개 엔티티 자동 생성
 * const meeting = await createMeetingFixture(em);
 *
 * @example
 * // ✅ 권장: PUBLISHED 상태로 생성 (목록 조회 테스트용)
 * const meeting = await createMeetingFixture(em, {
 *   status: MeetingStatus.PUBLISHED
 * });
 *
 * @example
 * // ✅ 권장: 관계를 명시적으로 설정
 * const workspace = await createWorkspaceFixture(em);
 * const owner = await createWorkspaceMemberFixture(em, { workspace });
 * const resource = await createResourceFixture(em, { workspace, owner });
 * const meeting = await createMeetingFixture(em, {
 *   workspace,
 *   resource,
 *   status: MeetingStatus.PUBLISHED
 * });
 */
export async function createMeetingFixture(
  em: EntityManager,
  options: {
    workspace?: Workspace;
    resource?: Resource;
    owner?: WorkspaceMember;
    status?: MeetingStatus;
  } = {}
): Promise<Meeting> {
  const workspace = options.workspace ?? (await createWorkspaceFixture(em));
  const resource =
    options.resource ??
    (await createResourceFixture(em, {
      workspace,
      owner: options.owner,
      type: ResourceType.MEETING,
      title: 'Test Meeting',
    }));

  const meeting = new Meeting();
  meeting.resource = resource;
  meeting.workspace = workspace;
  meeting.status = options.status ?? MeetingStatus.DRAFT;
  meeting.memo = null;
  meeting.summary = null;
  meeting.tags = [];

  await em.persistAndFlush(meeting);
  return meeting;
}

/**
 * Meeting + 기본 관계 엔티티 모두 자동 생성
 *
 * @description
 * Meeting과 관련된 모든 엔티티를 기본값으로 자동 생성합니다.
 * 이 함수는 **명시적으로 "자동 생성"을 의도할 때만 사용**하세요.
 *
 * **자동 생성되는 엔티티 (최대 6개):**
 * 1. Workspace
 * 2. WorkspaceMember
 * 3. User
 * 4. Role
 * 5. WorkspaceMemberRole
 * 6. Resource
 *
 * @param em - MikroORM EntityManager
 * @param status - Meeting 상태 (기본값: DRAFT)
 * @returns DB에 저장된 Meeting 엔티티
 *
 * @example
 * // ✅ 빠른 DRAFT Meeting 생성
 * const meeting = await createMeetingWithDefaultRelations(em);
 *
 * @example
 * // ✅ PUBLISHED Meeting 생성 (목록 조회 테스트용)
 * const meeting = await createMeetingWithDefaultRelations(em, MeetingStatus.PUBLISHED);
 *
 * @see {@link createMeetingFixture} 관계를 명시적으로 설정할 때 사용
 */
export async function createMeetingWithDefaultRelations(
  em: EntityManager,
  status: MeetingStatus = MeetingStatus.DRAFT
): Promise<Meeting> {
  return createMeetingFixture(em, {
    workspace: undefined,
    resource: undefined,
    owner: undefined,
    status,
  });
}

/**
 * 여러 Meeting 한 번에 생성
 *
 * @description
 * 지정한 개수만큼 Meeting 엔티티를 생성하고 DB에 저장합니다.
 * 각 Meeting은 고유한 Resource를 가집니다.
 *
 * @param em - MikroORM EntityManager
 * @param count - 생성할 Meeting 개수 (기본값: 3)
 * @param options - 옵션 객체
 * @returns DB에 저장된 Meeting 엔티티 배열
 *
 * @default status - MeetingStatus.DRAFT
 *
 * @example
 * // PUBLISHED 상태로 3개 생성 (목록 조회 테스트용)
 * const meetings = await createMeetingListFixture(em, 3, {
 *   status: MeetingStatus.PUBLISHED
 * });
 */
export async function createMeetingListFixture(
  em: EntityManager,
  count: number = 3,
  options: {
    workspace?: Workspace;
    status?: MeetingStatus;
  } = {}
): Promise<Meeting[]> {
  const workspace = options.workspace ?? (await createWorkspaceFixture(em));

  const meetings: Meeting[] = [];
  for (let i = 0; i < count; i++) {
    const resource = await createResourceFixture(em, {
      workspace,
      type: ResourceType.MEETING,
      title: `Test Meeting ${i + 1}`,
    });

    const meeting = new Meeting();
    meeting.resource = resource;
    meeting.workspace = workspace;
    meeting.status = options.status ?? MeetingStatus.DRAFT;
    meeting.memo = null;
    meeting.summary = null;
    meeting.tags = [];

    meetings.push(meeting);
  }

  await em.persistAndFlush(meetings);
  return meetings;
}

/**
 * 테스트용 Space 생성
 *
 * @description
 * Space 엔티티를 생성하고 DB에 저장합니다.
 *
 * ⚠️ **경고: 캐스케이딩 생성**
 * - Workspace (미제공 시 자동 생성)
 * - Resource (미제공 시 자동 생성, ResourceType.SPACE)
 *
 * @param em - MikroORM EntityManager
 * @param options - 옵션 객체
 * @returns DB에 저장된 Space 엔티티
 *
 * @default description - null
 */
export async function createSpaceFixture(
  em: EntityManager,
  options: {
    workspace?: Workspace;
    resource?: Resource;
    description?: string;
  } = {}
): Promise<Space> {
  const workspace = options.workspace ?? (await createWorkspaceFixture(em));
  const resource =
    options.resource ??
    (await createResourceFixture(em, {
      workspace,
      type: ResourceType.SPACE,
      title: 'Test Space',
    }));

  const space = new Space();
  space.resource = resource;
  space.workspace = workspace;
  space.description = options.description ?? null;

  await em.persistAndFlush(space);
  return space;
}
