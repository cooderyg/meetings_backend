import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { MeetingParticipantRepository } from './meeting-participant.repository';
import { CreateMeetingParticipantArgs } from './interface/args/create-meeting-participant.args';
import { MeetingService } from '../meeting/meeting.service';
import { AppError } from '../../shared/exception/app.error';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';

@Injectable()
export class MeetingParticipantService {
  constructor(
    private readonly em: EntityManager,
    private readonly repository: MeetingParticipantRepository,
    private readonly meetingService: MeetingService,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  /**
   * Meeting 참여자 생성 (중복 검증 + 생성, Race Condition 방지)
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async create(args: CreateMeetingParticipantArgs) {
    const { meetingId, workspaceId, workspaceMemberId, guestName } = args;

    const meeting = await this.meetingService.getMeetingById(
      meetingId,
      workspaceId
    );

    if (!meeting) {
      throw new AppError('meetingParticipant.create.meetingNotFound');
    }

    if (workspaceMemberId) {
      const workspaceMember =
        await this.workspaceMemberService.findById(workspaceMemberId);

      if (!workspaceMember) {
        throw new AppError('meetingParticipant.create.memberNotFound');
      }

      // 중복 참여 검증
      const isDuplicate = await this.findByMeetingAndMember(
        meetingId,
        workspaceMemberId
      );

      if (isDuplicate) {
        throw new AppError('meetingParticipant.create.duplicate');
      }

      return await this.repository.create({ meeting, workspaceMember });
    }

    return await this.repository.create({ meeting, guestName });
  }

  /**
   * Meeting 참여자 삭제 (조회 + 삭제 원자성 보장)
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async delete(id: string) {
    const meetingParticipant = await this.repository.findById(id);

    if (!meetingParticipant) {
      throw new AppError('meetingParticipant.delete.notFound');
    }

    await this.repository.delete(meetingParticipant);
  }

  async findByMeetingAndMember(meetingId: string, workspaceMemberId: string) {
    return await this.repository.findByMeetingAndMember(
      meetingId,
      workspaceMemberId
    );
  }
}
