export interface CreateMeetingParticipantArgs {
  meetingId: string;
  workspaceId: string;
  workspaceMemberId?: string;
  guestName?: string;
}
