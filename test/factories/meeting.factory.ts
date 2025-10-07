import { EntityManager } from '@mikro-orm/postgresql';
import {
  Meeting,
  MeetingStatus,
} from '../../src/domain/meeting/entity/meeting.entity';
import { Resource } from '../../src/domain/resource/entity/resource.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { BaseFactory } from './base.factory';
import { ResourceFactory } from './resource.factory';

/**
 * Meeting 엔티티용 Test Data Builder
 *
 * @example
 * ```typescript
 * // 기본 Meeting 생성 (Resource 자동 생성)
 * const meeting = await new MeetingFactory(em)
 *   .forWorkspace(workspace)
 *   .create();
 *
 * // Fluent API로 커스터마이징
 * const completedMeeting = await new MeetingFactory(em)
 *   .forWorkspace(workspace)
 *   .asCompleted()
 *   .withMemo('회의 메모')
 *   .withTags(['중요', '기획'])
 *   .create();
 *
 * // Resource를 직접 지정
 * const meetingWithResource = await new MeetingFactory(em)
 *   .forWorkspace(workspace)
 *   .withResource(resource)
 *   .create();
 * ```
 */
export class MeetingFactory extends BaseFactory<Meeting> {
  private workspace?: Workspace;
  private resource?: Resource;
  private status?: MeetingStatus;
  private memo?: string | null;
  private summary?: string | null;
  private tags?: string[];

  async build(overrides?: Partial<Meeting>): Promise<Meeting> {
    const meeting = new Meeting();

    // Workspace 자동 생성 (제공되지 않은 경우)
    let targetWorkspace = overrides?.workspace ?? this.workspace;
    if (!targetWorkspace && this.em && Object.keys(this.em).length > 0) {
      const { WorkspaceFactory } = await import('./workspace.factory');
      targetWorkspace = await new WorkspaceFactory(this.em).create();
    }

    // Resource 자동 생성 (제공되지 않은 경우, EntityManager가 유효한 경우에만)
    let targetResource = overrides?.resource ?? this.resource;
    if (!targetResource && this.em && Object.keys(this.em).length > 0 && targetWorkspace) {
      // Resource 생성 시 owner(WorkspaceMember)도 자동 생성
      const { createWorkspaceMemberFixture } = await import('../../test/fixtures/meeting.fixture');
      const owner = await createWorkspaceMemberFixture(this.em, { workspace: targetWorkspace });

      targetResource = await new ResourceFactory(this.em)
        .forWorkspace(targetWorkspace)
        .withOwner(owner)
        .asMeeting()
        .withTitle('Test Meeting')
        .create();
    }

    meeting.workspace = targetWorkspace as any; // 레거시 호환
    meeting.resource = targetResource as any; // 레거시 호환
    meeting.status = overrides?.status ?? this.status ?? MeetingStatus.DRAFT;
    meeting.memo =
      overrides?.memo !== undefined
        ? overrides.memo
        : this.memo ?? null;
    meeting.summary =
      overrides?.summary !== undefined
        ? overrides.summary
        : this.summary ?? null;
    meeting.tags = overrides?.tags ?? this.tags ?? [];

    return meeting;
  }

  /**
   * Workspace 설정 (필수)
   */
  forWorkspace(workspace: Workspace): this {
    this.workspace = workspace;
    return this;
  }

  /**
   * Resource 직접 설정 (선택)
   */
  withResource(resource: Resource): this {
    this.resource = resource;
    return this;
  }

  /**
   * 상태 설정
   */
  withStatus(status: MeetingStatus): this {
    this.status = status;
    return this;
  }

  /**
   * 메모 설정
   */
  withMemo(memo: string): this {
    this.memo = memo;
    return this;
  }

  /**
   * 요약 설정
   */
  withSummary(summary: string): this {
    this.summary = summary;
    return this;
  }

  /**
   * 태그 설정
   */
  withTags(...tags: string[]): this {
    this.tags = tags;
    return this;
  }

  /**
   * Draft 상태로 설정
   */
  asDraft(): this {
    return this.withStatus(MeetingStatus.DRAFT);
  }

  /**
   * 진행 중 상태로 설정
   */
  asInProgress(): this {
    return this.withStatus(MeetingStatus.IN_PROGRESS);
  }

  /**
   * 완료 상태로 설정
   */
  asCompleted(): this {
    return this.withStatus(MeetingStatus.COMPLETED);
  }

  /**
   * 일시정지 상태로 설정
   */
  asPaused(): this {
    return this.withStatus(MeetingStatus.PAUSED);
  }

  /**
   * 발행 상태로 설정
   */
  asPublished(): this {
    return this.withStatus(MeetingStatus.PUBLISHED);
  }

  // ============================================================
  // 레거시 호환성을 위한 정적 메서드
  // ============================================================

  /**
   * @deprecated 인스턴스 기반 API 사용 권장
   * 레거시 호환용 - Resource를 자동 생성하지 않음
   */
  static createForWorkspace(
    workspace: Workspace,
    owner?: any,
    overrides: Partial<Meeting> = {}
  ): Meeting {
    const meeting = new Meeting();
    meeting.workspace = workspace;
    meeting.resource = overrides.resource ?? null as any; // Resource는 외부에서 제공해야 함
    meeting.status = overrides.status ?? MeetingStatus.DRAFT;
    meeting.memo = overrides.memo ?? null;
    meeting.summary = overrides.summary ?? null;
    meeting.tags = overrides.tags ?? [];

    // 다른 overrides 적용
    Object.assign(meeting, overrides);

    return meeting;
  }
}
