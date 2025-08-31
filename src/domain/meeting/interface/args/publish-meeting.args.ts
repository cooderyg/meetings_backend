import { PublishMeetingDto } from '../../dto/request/publish-meeting.dto';

export interface PublishMeetingArgs {
  id: string;
  workspaceId: string;
  workspaceMemberId: string;
  data: PublishMeetingDto;
}