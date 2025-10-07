import { EntityManager } from '@mikro-orm/postgresql';
import {
  Workspace,
  SubscriptionTier,
} from '../../src/domain/workspace/entity/workspace.entity';

/**
 * 테스트용 Workspace 생성
 *
 * @description
 * Workspace 엔티티를 생성하고 DB에 저장합니다.
 * overrides로 특정 필드만 커스텀 설정 가능하며, 나머지는 테스트용 기본값 사용.
 *
 * @param em - MikroORM EntityManager
 * @param overrides - Workspace 필드 일부 오버라이드 (선택)
 * @returns DB에 저장된 Workspace 엔티티
 *
 * @default name - 'Test Workspace {timestamp}' (타임스탬프로 고유성 보장)
 * @default subscriptionTier - SubscriptionTier.FREE
 *
 * @example
 * // 기본값으로 생성 (FREE 티어)
 * const workspace = await createWorkspaceFixture(em);
 * expect(workspace.subscriptionTier).toBe(SubscriptionTier.FREE);
 *
 * @example
 * // 특정 필드만 커스텀 설정
 * const workspace = await createWorkspaceFixture(em, {
 *   name: 'My Company Workspace',
 *   subscriptionTier: SubscriptionTier.PRO
 * });
 */
export async function createWorkspaceFixture(
  em: EntityManager,
  overrides: Partial<Workspace> = {}
): Promise<Workspace> {
  const workspace = new Workspace();
  workspace.name = overrides.name ?? `Test Workspace ${Date.now()}`;
  workspace.subscriptionTier =
    overrides.subscriptionTier ?? SubscriptionTier.FREE;

  await em.persistAndFlush(workspace);
  return workspace;
}

/**
 * 여러 Workspace 한 번에 생성
 *
 * @description
 * 지정한 개수만큼 Workspace 엔티티를 생성하고 DB에 저장합니다.
 * 각 Workspace는 고유한 name을 가집니다.
 *
 * @param em - MikroORM EntityManager
 * @param count - 생성할 Workspace 개수 (기본값: 3)
 * @returns DB에 저장된 Workspace 엔티티 배열
 *
 * @default 각 Workspace의 name - 'Test Workspace 1', 'Test Workspace 2', ...
 * @default 각 Workspace의 subscriptionTier - SubscriptionTier.FREE
 *
 * @example
 * // 3개의 Workspace 생성
 * const workspaces = await createWorkspaceListFixture(em);
 * expect(workspaces).toHaveLength(3);
 * expect(workspaces[0].name).toBe('Test Workspace 1');
 */
export async function createWorkspaceListFixture(
  em: EntityManager,
  count: number = 3
): Promise<Workspace[]> {
  const workspaces = Array.from({ length: count }, (_, i) => {
    const workspace = new Workspace();
    workspace.name = `Test Workspace ${i + 1}`;
    workspace.subscriptionTier = SubscriptionTier.FREE;
    return workspace;
  });

  await em.persistAndFlush(workspaces);
  return workspaces;
}
