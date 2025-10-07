import { EntityManager } from '@mikro-orm/postgresql';
import { Meeting, MeetingStatus } from '../../src/domain/meeting/entity/meeting.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { User } from '../../src/domain/user/entity/user.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { Resource } from '../../src/domain/resource/entity/resource.entity';
import { MeetingFactory } from '../factories/meeting.factory';
import { ResourceFactory } from '../factories/resource.factory';
import { WorkspaceScenarios } from './workspace.scenarios';

/**
 * Meeting 관련 고수준 테스트 시나리오
 *
 * 복잡한 회의 시나리오를 캡슐화하여 E2E 테스트와 통합 테스트에서 재사용합니다.
 *
 * @example
 * ```typescript
 * const scenarios = new MeetingScenarios(em);
 *
 * // 기본 회의 (워크스페이스 + 관리자 + 회의)
 * const { meeting, workspace, owner } = await scenarios.createBasicMeeting();
 *
 * // 참여자가 있는 회의
 * const { meeting, participants } = await scenarios.createMeetingWithParticipants(5);
 *
 * // 완전한 회의 (메모, 요약, 태그 포함)
 * const completeMeeting = await scenarios.createCompletedMeetingWithContent();
 * ```
 */
export class MeetingScenarios {
  private workspaceScenarios: WorkspaceScenarios;

  constructor(private em: EntityManager) {
    this.workspaceScenarios = new WorkspaceScenarios(em);
  }

  /**
   * 기본 회의 생성 (워크스페이스 + 관리자 + DRAFT 회의)
   * - 가장 단순한 회의 시나리오
   */
  async createBasicMeeting(): Promise<{
    meeting: Meeting;
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
    resource: Resource;
  }> {
    const { workspace, admin: owner, adminMember: ownerMember } =
      await this.workspaceScenarios.createWorkspaceWithAdmin();

    const meeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asDraft()
      .create();

    return {
      meeting,
      workspace,
      owner,
      ownerMember,
      resource: meeting.resource,
    };
  }

  /**
   * 진행 중인 회의 생성
   * - IN_PROGRESS 상태의 회의
   */
  async createInProgressMeeting(): Promise<{
    meeting: Meeting;
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
  }> {
    const { workspace, admin: owner, adminMember: ownerMember } =
      await this.workspaceScenarios.createWorkspaceWithAdmin();

    const meeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asInProgress()
      .create();

    return { meeting, workspace, owner, ownerMember };
  }

  /**
   * 완료된 회의 생성 (메모, 요약, 태그 포함)
   * - COMPLETED 상태
   * - 실제 회의 결과물 포함
   */
  async createCompletedMeetingWithContent(): Promise<{
    meeting: Meeting;
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
  }> {
    const { workspace, admin: owner, adminMember: ownerMember } =
      await this.workspaceScenarios.createWorkspaceWithAdmin();

    const meeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asCompleted()
      .withMemo('회의 메모: 주요 논의 사항 정리')
      .withSummary('회의 요약: 다음 스프린트 계획 수립')
      .withTags('중요', '기획', '스프린트')
      .create();

    return { meeting, workspace, owner, ownerMember };
  }

  /**
   * 발행된 회의 생성
   * - PUBLISHED 상태
   * - 모든 콘텐츠 포함
   */
  async createPublishedMeeting(): Promise<{
    meeting: Meeting;
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
  }> {
    const { workspace, admin: owner, adminMember: ownerMember } =
      await this.workspaceScenarios.createWorkspaceWithAdmin();

    const meeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asPublished()
      .withMemo('발행된 회의 메모')
      .withSummary('발행된 회의 요약')
      .withTags('발행', '공개')
      .create();

    return { meeting, workspace, owner, ownerMember };
  }

  /**
   * 여러 회의가 있는 워크스페이스
   * - 다양한 상태의 회의들
   * - 회의 목록/검색 테스트용
   */
  async createWorkspaceWithMultipleMeetings(meetingCount: number = 5): Promise<{
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
    meetings: Meeting[];
  }> {
    const { workspace, admin: owner, adminMember: ownerMember } =
      await this.workspaceScenarios.createWorkspaceWithAdmin();

    const meetings: Meeting[] = [];

    // 다양한 상태의 회의 생성
    const statuses = [
      MeetingStatus.DRAFT,
      MeetingStatus.IN_PROGRESS,
      MeetingStatus.COMPLETED,
      MeetingStatus.PUBLISHED,
      MeetingStatus.PAUSED,
    ];

    for (let i = 0; i < meetingCount; i++) {
      const status = statuses[i % statuses.length];
      const meeting = await new MeetingFactory(this.em)
        .forWorkspace(workspace)
        .withStatus(status)
        .create();

      meetings.push(meeting);
    }

    return { workspace, owner, ownerMember, meetings };
  }

  /**
   * 팀 회의 시나리오 (여러 참여자)
   * - 워크스페이스에 여러 멤버
   * - 회의 진행 중
   */
  async createTeamMeeting(participantCount: number = 5): Promise<{
    meeting: Meeting;
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
    participants: User[];
    participantMembers: WorkspaceMember[];
  }> {
    const {
      workspace,
      admin: owner,
      adminMember: ownerMember,
      members: participants,
      workspaceMembers: participantMembers,
    } = await this.workspaceScenarios.createWorkspaceWithMembers(participantCount);

    const meeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asInProgress()
      .withTags('팀미팅', '정기회의')
      .create();

    return {
      meeting,
      workspace,
      owner,
      ownerMember,
      participants,
      participantMembers,
    };
  }

  /**
   * 전체 워크플로우: Draft → In Progress → Completed → Published
   * - 회의 상태 전환 테스트용
   */
  async createMeetingWorkflow(): Promise<{
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
    draftMeeting: Meeting;
    inProgressMeeting: Meeting;
    completedMeeting: Meeting;
    publishedMeeting: Meeting;
  }> {
    const { workspace, admin: owner, adminMember: ownerMember } =
      await this.workspaceScenarios.createWorkspaceWithAdmin();

    const draftMeeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asDraft()
      .create();

    const inProgressMeeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asInProgress()
      .create();

    const completedMeeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asCompleted()
      .withMemo('완료된 회의 메모')
      .create();

    const publishedMeeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asPublished()
      .withMemo('발행된 회의 메모')
      .withSummary('발행된 회의 요약')
      .create();

    return {
      workspace,
      owner,
      ownerMember,
      draftMeeting,
      inProgressMeeting,
      completedMeeting,
      publishedMeeting,
    };
  }

  /**
   * Premium 워크스페이스의 고급 회의
   * - 프리미엄 기능 테스트용
   */
  async createPremiumMeeting(): Promise<{
    meeting: Meeting;
    workspace: Workspace;
    owner: User;
    ownerMember: WorkspaceMember;
    members: User[];
  }> {
    const {
      workspace,
      admin: owner,
      adminMember: ownerMember,
      members,
    } = await this.workspaceScenarios.createPremiumWorkspace(3);

    const meeting = await new MeetingFactory(this.em)
      .forWorkspace(workspace)
      .asInProgress()
      .withMemo('프리미엄 워크스페이스 회의')
      .withTags('프리미엄', 'VIP')
      .create();

    return { meeting, workspace, owner, ownerMember, members };
  }
}
