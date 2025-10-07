import { EntityManager } from '@mikro-orm/postgresql';
import {
  Workspace,
  SubscriptionTier,
} from '../../src/domain/workspace/entity/workspace.entity';

/**
 * 테스트용 Workspace 생성
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
