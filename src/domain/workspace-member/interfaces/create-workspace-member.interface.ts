export interface ICreateWorkspaceMember {
  workspaceId: string;
  userId: string;
  firstName: string;
  lastName: string;
  roleId?: string; // 기본값은 OWNER 역할
  imagePath?: string;
}
