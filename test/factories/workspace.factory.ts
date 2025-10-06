import {
  Workspace,
  SubscriptionTier,
} from '../../src/domain/workspace/entity/workspace.entity';
import { v4 as uuid } from 'uuid';

/**
 * Workspace 테스트 데이터 생성 Factory
 *
 * @example
 * const workspace = WorkspaceFactory.create();
 * const premiumWorkspace = WorkspaceFactory.create({ subscriptionTier: SubscriptionTier.PREMIUM });
 * const workspaces = WorkspaceFactory.createMany(3);
 */
export class WorkspaceFactory {
  /**
   * 단일 Workspace 엔티티 생성
   */
  static create(overrides: Partial<Workspace> = {}): Workspace {
    const workspace = new Workspace();

    // 기본값 설정
    Object.assign(workspace, {
      id: overrides.id || uuid(),
      name: overrides.name || `Test Workspace ${Date.now()}`,
      subscriptionTier: overrides.subscriptionTier || SubscriptionTier.FREE,
      imagePath: overrides.imagePath || null,
      settings: overrides.settings || {},
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    });

    return workspace;
  }

  /**
   * 여러 Workspace 엔티티 생성
   */
  static createMany(
    count: number,
    overrides: Partial<Workspace> = {}
  ): Workspace[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        name: overrides.name || `Test Workspace ${index + 1} ${Date.now()}`,
      })
    );
  }

  /**
   * Free 티어 워크스페이스 생성
   */
  static createFree(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({
      ...overrides,
      subscriptionTier: SubscriptionTier.FREE,
    });
  }

  /**
   * Basic 티어 워크스페이스 생성
   */
  static createBasic(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({
      ...overrides,
      subscriptionTier: SubscriptionTier.BASIC,
    });
  }

  /**
   * Premium 티어 워크스페이스 생성
   */
  static createPremium(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({
      ...overrides,
      subscriptionTier: SubscriptionTier.PREMIUM,
    });
  }

  /**
   * Enterprise 티어 워크스페이스 생성
   */
  static createEnterprise(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({
      ...overrides,
      subscriptionTier: SubscriptionTier.ENTERPRISE,
    });
  }

  /**
   * 특정 이름을 가진 워크스페이스 생성
   */
  static createWithName(
    name: string,
    overrides: Partial<Workspace> = {}
  ): Workspace {
    return this.create({
      ...overrides,
      name,
    });
  }

  /**
   * 이미지가 있는 워크스페이스 생성
   */
  static createWithImage(
    imagePath: string,
    overrides: Partial<Workspace> = {}
  ): Workspace {
    return this.create({
      ...overrides,
      imagePath,
    });
  }

  /**
   * 커스텀 설정을 가진 워크스페이스 생성
   */
  static createWithSettings(
    settings: Record<string, any>,
    overrides: Partial<Workspace> = {}
  ): Workspace {
    return this.create({
      ...overrides,
      settings,
    });
  }
}
