import { EntityManager } from '@mikro-orm/postgresql';
import { Invitation } from '../../src/domain/invitation/entity/invitation.entity';
import { InvitationStatus } from '../../src/domain/invitation/enum/invitation-status.enum';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { Space } from '../../src/domain/space/entity/space.entity';
import { Role } from '../../src/domain/role/entity/role.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { createWorkspaceFixture } from './workspace.fixture';
import { createRoleFixture } from './meeting.fixture';
import { SystemRole } from '../../src/domain/role/enum/system-role.enum';

/**
 * 테스트용 Invitation 생성
 *
 * @description
 * Invitation 엔티티를 생성하고 DB에 저장합니다.
 * overrides로 특정 필드만 커스텀 설정 가능하며, 나머지는 테스트용 기본값 사용.
 *
 * @param em - MikroORM EntityManager
 * @param overrides - Invitation 필드 일부 오버라이드 (선택)
 * @returns DB에 저장된 Invitation 엔티티
 *
 * @default inviteeEmail - 'invitee{timestamp}@example.com'
 * @default status - InvitationStatus.PENDING
 * @default expiresAt - 7일 후
 * @default workspace - 자동 생성된 Workspace
 * @default role - SystemRole.CAN_VIEW
 * @default inviter - 필수 (반드시 전달해야 함)
 *
 * @example
 * // 워크스페이스 초대 생성
 * const invitation = await createInvitationFixture(em, {
 *   inviter: workspaceMember,
 *   inviteeEmail: 'test@example.com',
 * });
 *
 * @example
 * // 스페이스 초대 생성
 * const invitation = await createInvitationFixture(em, {
 *   inviter: workspaceMember,
 *   space: mySpace,
 *   inviteeEmail: 'test@example.com',
 * });
 */
export async function createInvitationFixture(
  em: EntityManager,
  overrides: Partial<Invitation> & { inviter: WorkspaceMember }
): Promise<Invitation> {
  const workspace =
    overrides.workspace ?? (await createWorkspaceFixture(em));
  const role =
    overrides.role ?? (await createRoleFixture(em, SystemRole.CAN_VIEW));

  const invitation = new Invitation();
  invitation.workspace = workspace;
  invitation.space = overrides.space ?? null;
  invitation.inviteeEmail =
    overrides.inviteeEmail ?? `invitee${Date.now()}@example.com`;
  invitation.role = role;
  invitation.status = overrides.status ?? InvitationStatus.PENDING;
  invitation.expiresAt =
    overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후
  invitation.inviter = overrides.inviter;

  if (overrides.token) {
    invitation.token = overrides.token;
  }

  await em.persistAndFlush(invitation);
  return invitation;
}

/**
 * 여러 Invitation 한 번에 생성
 *
 * @description
 * 지정한 개수만큼 Invitation 엔티티를 생성하고 DB에 저장합니다.
 * 각 Invitation은 고유한 이메일을 가집니다.
 *
 * @param em - MikroORM EntityManager
 * @param count - 생성할 Invitation 개수 (기본값: 3)
 * @param baseOverrides - 모든 Invitation에 공통 적용할 오버라이드
 * @returns DB에 저장된 Invitation 엔티티 배열
 *
 * @example
 * // 같은 워크스페이스에 3개의 초대 생성
 * const invitations = await createInvitationListFixture(em, 3, {
 *   inviter: workspaceMember,
 *   workspace: myWorkspace,
 * });
 */
export async function createInvitationListFixture(
  em: EntityManager,
  count: number = 3,
  baseOverrides: Partial<Invitation> & { inviter: WorkspaceMember }
): Promise<Invitation[]> {
  const invitations = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createInvitationFixture(em, {
        ...baseOverrides,
        inviteeEmail: `invitee${i + 1}@example.com`,
      })
    )
  );

  return invitations;
}
