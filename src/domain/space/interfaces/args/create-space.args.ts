export interface CreateSpaceArgs {
  title: string;
  workspaceMemberId: string;
  description?: string;
  workspaceId: string;
  parentPath?: string;
}
