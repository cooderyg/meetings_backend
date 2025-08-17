export interface CreateSpaceArgs {
  title: string;
  userId: string;
  description?: string;
  workspaceId: string;
  parentPath?: string;
}
