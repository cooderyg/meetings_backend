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
 */
export async function createWorkspaceMemberFixture(
  em: EntityManager,
  options: {
    workspace?: Workspace;
    user?: User;
    role?: Role;
  } = {}
): Promise<WorkspaceMember> {
  const workspace = options.workspace ?? (await createWorkspaceFixture(em));
  const user = options.user ?? (await createUserFixture(em));
  const role = options.role ?? (await createRoleFixture(em));

  const workspaceMember = new WorkspaceMember();
  workspaceMember.workspace = workspace;
  workspaceMember.user = user;
  workspaceMember.firstName = user.firstName;
  workspaceMember.lastName = user.lastName;
  workspaceMember.isActive = true;

  await em.persistAndFlush(workspaceMember);

  // Create WorkspaceMemberRole separately
  const workspaceMemberRole = new WorkspaceMemberRole();
  workspaceMemberRole.workspaceMember = workspaceMember;
  workspaceMemberRole.role = role;

  await em.persistAndFlush(workspaceMemberRole);

  return workspaceMember;
}

/**
 * 테스트용 Resource 생성
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
 * 여러 Meeting 한 번에 생성
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
