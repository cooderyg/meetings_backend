export interface ICreateWorkspaceInvitationArgs {
  workspaceId: string;
  inviterId: string;
  inviteeEmail: string;
  roleId: number;
  expirationDays?: number; // 기본값 7일
}
