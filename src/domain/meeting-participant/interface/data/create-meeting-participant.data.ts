import { Meeting } from '../../../meeting/entity/meeting.entity';
import { WorkspaceMember } from '../../../workspace-member/entity/workspace-member.entity';

export interface CreateMeetingParticipantData {
  meeting: Meeting;
  workspaceMember?: WorkspaceMember;
  guestName?: string;
}
