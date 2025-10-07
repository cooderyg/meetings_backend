import {
  Meeting,
  MeetingStatus,
} from '../../src/domain/meeting/entity/meeting.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from '../../src/domain/resource/entity/resource.entity';
import { v4 as uuid } from 'uuid';

/**
 * Meeting 테스트 데이터 생성 Factory
 *
 * @example
 * const meeting = MeetingFactory.create();
 * const draftMeeting = MeetingFactory.create({ status: MeetingStatus.DRAFT });
 * const meetings = MeetingFactory.createMany(3);
 */
export class MeetingFactory {
  /**
   * 단일 Meeting 엔티티 생성
   */
  static create(overrides: Partial<Meeting> = {}): Meeting {
    const meeting = new Meeting();

    // 기본값 설정
    Object.assign(meeting, {
      id: overrides.id || uuid(),
      status: overrides.status || MeetingStatus.DRAFT,
      tags: overrides.tags || [],
      memo: overrides.memo || null,
      summary: overrides.summary || null,
      deletedAt: overrides.deletedAt || null,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides, // overrides를 마지막에 적용하여 resource 등 다른 필드도 포함
    });

    return meeting;
  }

  /**
   * 여러 Meeting 엔티티 생성
   */
  static createMany(
    count: number,
    overrides: Partial<Meeting> = {}
  ): Meeting[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        id: overrides.id || uuid(),
      })
    );
  }

  /**
   * Draft 상태 미팅 생성
   */
  static createDraft(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      status: MeetingStatus.DRAFT,
    });
  }

  /**
   * 진행 중인 미팅 생성
   */
  static createInProgress(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      status: MeetingStatus.IN_PROGRESS,
    });
  }

  /**
   * 완료된 미팅 생성
   */
  static createCompleted(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      status: MeetingStatus.COMPLETED,
    });
  }

  /**
   * 일시정지된 미팅 생성
   */
  static createPaused(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      status: MeetingStatus.PAUSED,
    });
  }

  /**
   * 발행된 미팅 생성
   */
  static createPublished(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      status: MeetingStatus.PUBLISHED,
    });
  }

  /**
   * 메모가 있는 미팅 생성
   */
  static createWithMemo(
    memo: string,
    overrides: Partial<Meeting> = {}
  ): Meeting {
    return this.create({
      ...overrides,
      memo,
    });
  }

  /**
   * 요약이 있는 미팅 생성
   */
  static createWithSummary(
    summary: string,
    overrides: Partial<Meeting> = {}
  ): Meeting {
    return this.create({
      ...overrides,
      summary,
    });
  }

  /**
   * 태그가 있는 미팅 생성
   */
  static createWithTags(
    tags: string[],
    overrides: Partial<Meeting> = {}
  ): Meeting {
    return this.create({
      ...overrides,
      tags,
    });
  }

  /**
   * 삭제된 미팅 생성
   */
  static createDeleted(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      deletedAt: new Date(),
    });
  }

  /**
   * 특정 워크스페이스에 속한 미팅 생성 (resource 포함)
   * 주의: resource는 별도로 persistAndFlush 해야 함
   */
  static createForWorkspace(
    workspace: Workspace,
    owner?: WorkspaceMember,
    overrides: Partial<Meeting> = {}
  ): Meeting {
    // Resource가 제공되지 않은 경우 기본 Resource 생성
    if (!overrides.resource) {
      const resource = new Resource();
      resource.id = uuid();
      resource.type = ResourceType.MEETING;
      resource.title = 'Untitled';
      resource.visibility = ResourceVisibility.PUBLIC;
      resource.workspace = workspace;
      resource.path = `root.meeting_${Date.now()}`;
      resource.createdAt = new Date();
      resource.updatedAt = new Date();

      // owner가 제공된 경우에만 설정 (선택적)
      if (owner) {
        resource.owner = owner;
      }

      return this.create({
        workspace, // workspace 필드 추가
        ...overrides,
        resource,
      });
    }

    return this.create({
      workspace,
      ...overrides,
    });
  }

  /**
   * 특정 리소스와 연결된 미팅 생성
   */
  static createWithResource(
    resource: Resource,
    overrides: Partial<Meeting> = {}
  ): Meeting {
    return this.create({
      ...overrides,
      resource,
    });
  }

  /**
   * 완전한 미팅 생성 (메모, 요약, 태그 포함)
   */
  static createComplete(overrides: Partial<Meeting> = {}): Meeting {
    return this.create({
      ...overrides,
      memo: overrides.memo || '테스트 미팅 메모입니다.',
      summary: overrides.summary || '테스트 미팅 요약입니다.',
      tags: overrides.tags || ['테스트', '미팅'],
      status: overrides.status || MeetingStatus.COMPLETED,
    });
  }
}
