export interface SendInvitationMailArgs {
  email: string;
  inviterName: string;
  workspaceName: string;
  invitationToken: string;
  expiresAt: Date;
  isWorkspaceInvitation: boolean;
  spaceName?: string;
  userId?: string;
}
