import { Injectable } from '@nestjs/common';
import { MeetingParticipantRepository } from './meeting-participant.repository';
import { CreateMeetingParticipantArgs } from './interface/args/create-meeting-participant.args';
import { MeetingService } from '../meeting/meeting.service';
import { AppError } from '../../shared/exception/app.error';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';

@Injectable()
export class MeetingParticipantService {
  constructor(
    private readonly repository: MeetingParticipantRepository,
    private readonly meetingService: MeetingService,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  async create(args: CreateMeetingParticipantArgs) {
    const { meetingId, workspaceId, workspaceMemberId, guestName } = args;

    const meeting = await this.meetingService.findById(
      meetingId,
      workspaceId,
      true
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
      const isAlreadyParticipating = meeting.participants
        ?.toArray()
        .some(
          (participant) => participant.workspaceMember?.id === workspaceMemberId
        );

      if (isAlreadyParticipating) {
        throw new AppError('meetingParticipant.create.alreadyParticipating');
      }

      return await this.repository.create({ meeting, workspaceMember });
    }

    return await this.repository.create({ meeting, guestName });
  }

  async delete(id: string) {
    const meetingParticipant = await this.repository.findById(id);

    if (!meetingParticipant) {
      throw new AppError('meetingParticipant.delete.notFound');
    }

    await this.repository.delete(meetingParticipant);
  }
}
