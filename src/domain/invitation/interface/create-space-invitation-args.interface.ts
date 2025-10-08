export interface ICreateSpaceInvitationArgs {
  workspaceId: string;
  spaceId: string;
  inviterId: string;
  inviteeEmail: string;
  roleId: number;
  expirationDays?: number; // 기본값 7일
}
