import { EntityManager } from '@mikro-orm/postgresql';
import {
  Workspace,
  SubscriptionTier,
} from '../../src/domain/workspace/entity/workspace.entity';
import { BaseFactory } from './base.factory';
import { testSequence } from '../utils/sequence-generator';

/**
 * Workspace 엔티티용 Test Data Builder
 *
 * @example
 * ```typescript
 * // 기본 Workspace 생성
 * const workspace = await new WorkspaceFactory(em).create();
 *
 * // Fluent API로 커스터마이징
 * const premiumWorkspace = await new WorkspaceFactory(em)
 *   .withName('Premium Team')
 *   .asPremium()
 *   .create();
 *
 * // 여러 개 생성
 * const workspaces = await new WorkspaceFactory(em).createList(5);
 * ```
 */
export class WorkspaceFactory extends BaseFactory<Workspace> {
  private name?: string;
  private subscriptionTier?: SubscriptionTier;
  private imagePath?: string | null;
  private settings?: Record<string, any>;

  build(overrides?: Partial<Workspace>): Workspace {
    const workspace = new Workspace();

    workspace.name =
      overrides?.name ??
      this.name ??
      `Workspace ${testSequence.next('workspace')}`;

    workspace.subscriptionTier =
      overrides?.subscriptionTier ??
      this.subscriptionTier ??
      SubscriptionTier.FREE;

    workspace.imagePath =
      overrides?.imagePath !== undefined
        ? overrides.imagePath
        : this.imagePath ?? null;

    workspace.settings =
      overrides?.settings ?? this.settings ?? {};

    return workspace;
  }

  /**
   * Workspace 이름 설정
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * 구독 등급 설정
   */
  withTier(tier: SubscriptionTier): this {
    this.subscriptionTier = tier;
    return this;
  }

  /**
   * 이미지 경로 설정
   */
  withImage(imagePath: string): this {
    this.imagePath = imagePath;
    return this;
  }

  /**
   * 커스텀 설정 추가
   */
  withSettings(settings: Record<string, any>): this {
    this.settings = settings;
    return this;
  }

  /**
   * Free tier Workspace (기본값)
   */
  asFree(): this {
    return this.withTier(SubscriptionTier.FREE);
  }

  /**
   * Basic tier Workspace
   */
  asBasic(): this {
    return this.withTier(SubscriptionTier.BASIC);
  }

  /**
   * Premium tier Workspace
   */
  asPremium(): this {
    return this.withTier(SubscriptionTier.PREMIUM);
  }

  /**
   * Enterprise tier Workspace
   */
  asEnterprise(): this {
    return this.withTier(SubscriptionTier.ENTERPRISE);
  }

  // ============================================================
  // 레거시 호환성을 위한 정적 메서드
  // 기존 테스트 코드와의 호환성 유지용 - 새 코드에서는 인스턴스 메서드 사용 권장
  // ============================================================

  /**
   * @deprecated 인스턴스 기반 API 사용 권장: `new WorkspaceFactory(em).create()`
   */
  static create(overrides: Partial<Workspace> = {}): Workspace {
    const factory = new WorkspaceFactory({} as any); // EntityManager 없이 build만 사용
    return factory.build(overrides);
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장: `new WorkspaceFactory(em).createList(count)`
   */
  static createMany(count: number, overrides: Partial<Workspace> = {}): Workspace[] {
    const factory = new WorkspaceFactory({} as any);
    return Array.from({ length: count }, () => factory.build(overrides));
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createFree(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({ ...overrides, subscriptionTier: SubscriptionTier.FREE });
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createBasic(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({ ...overrides, subscriptionTier: SubscriptionTier.BASIC });
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createPremium(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({ ...overrides, subscriptionTier: SubscriptionTier.PREMIUM });
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createEnterprise(overrides: Partial<Workspace> = {}): Workspace {
    return this.create({ ...overrides, subscriptionTier: SubscriptionTier.ENTERPRISE });
  }
}
