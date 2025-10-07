import { EntityManager } from '@mikro-orm/postgresql';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from '../../src/domain/resource/entity/resource.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { BaseFactory } from './base.factory';
import { testSequence } from '../utils/sequence-generator';

/**
 * Resource 엔티티용 Test Data Builder
 *
 * @example
 * ```typescript
 * // 기본 Resource 생성
 * const resource = await new ResourceFactory(em)
 *   .forWorkspace(workspace)
 *   .create();
 *
 * // Fluent API로 커스터마이징
 * const meetingResource = await new ResourceFactory(em)
 *   .forWorkspace(workspace)
 *   .asMeeting()
 *   .withTitle('Weekly Standup')
 *   .asPublic()
 *   .create();
 * ```
 */
export class ResourceFactory extends BaseFactory<Resource> {
  private workspace?: Workspace;
  private owner?: WorkspaceMember;
  private type?: ResourceType;
  private title?: string;
  private visibility?: ResourceVisibility;
  private path?: string;

  build(overrides?: Partial<Resource>): Resource {
    const seq = testSequence.next('resource');
    const resource = new Resource();

    // Workspace는 필수 (레거시 호환성을 위해 경고만 출력)
    const targetWorkspace = overrides?.workspace ?? this.workspace;
    if (!targetWorkspace && this.em) {
      // EntityManager가 있는 경우(새 API 사용시)만 에러
      throw new Error('ResourceFactory: workspace is required. Use forWorkspace() to set it.');
    }

    resource.workspace = targetWorkspace as any; // 레거시 호환
    resource.owner = overrides?.owner ?? this.owner ?? null as any;
    resource.type = overrides?.type ?? this.type ?? ResourceType.MEETING;
    resource.title = overrides?.title ?? this.title ?? `Resource ${seq}`;
    resource.visibility = overrides?.visibility ?? this.visibility ?? ResourceVisibility.PUBLIC;
    resource.path = overrides?.path ?? this.path ?? `resource-${seq}`;

    return resource;
  }

  /**
   * Workspace 설정 (필수)
   */
  forWorkspace(workspace: Workspace): this {
    this.workspace = workspace;
    return this;
  }

  /**
   * Owner 설정
   */
  withOwner(owner: WorkspaceMember): this {
    this.owner = owner;
    return this;
  }

  /**
   * 타입 설정
   */
  withType(type: ResourceType): this {
    this.type = type;
    return this;
  }

  /**
   * 제목 설정
   */
  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  /**
   * 경로 설정
   */
  withPath(path: string): this {
    this.path = path;
    return this;
  }

  /**
   * 가시성 설정
   */
  withVisibility(visibility: ResourceVisibility): this {
    this.visibility = visibility;
    return this;
  }

  /**
   * Meeting 타입으로 설정
   */
  asMeeting(): this {
    return this.withType(ResourceType.MEETING);
  }

  /**
   * Space 타입으로 설정
   */
  asSpace(): this {
    return this.withType(ResourceType.SPACE);
  }

  /**
   * Public 가시성으로 설정
   */
  asPublic(): this {
    return this.withVisibility(ResourceVisibility.PUBLIC);
  }

  /**
   * Private 가시성으로 설정
   */
  asPrivate(): this {
    return this.withVisibility(ResourceVisibility.PRIVATE);
  }

  // ============================================================
  // 레거시 호환성을 위한 정적 메서드
  // ============================================================

  /**
   * @deprecated 인스턴스 기반 API 사용 권장: `new ResourceFactory(em).forWorkspace(workspace).create()`
   */
  static create(overrides: Partial<Resource> = {}): Resource {
    const factory = new ResourceFactory({} as any);
    // workspace가 없으면 빈 객체 사용 (레거시 호환)
    if (overrides.workspace) {
      factory.forWorkspace(overrides.workspace);
    }
    return factory.build(overrides);
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createMany(count: number, overrides: Partial<Resource> = {}): Resource[] {
    const factory = new ResourceFactory({} as any);
    if (overrides.workspace) {
      factory.forWorkspace(overrides.workspace);
    }
    return Array.from({ length: count }, () => factory.build(overrides));
  }

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   */
  static createForWorkspace(workspace: Workspace, overrides: Partial<Resource> = {}): Resource {
    return this.create({ ...overrides, workspace });
  }
}
