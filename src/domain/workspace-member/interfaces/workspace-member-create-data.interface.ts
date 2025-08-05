import { Role } from '../../role/entity/role.entity';
import { User } from '../../user/entity/user.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';

export interface IWorkspaceMemberCreateData {
  user: User;
  workspace: Workspace;
  role: Role;
  firstName: string;
  lastName: string;
  imagePath?: string;
  isActive: boolean;
}
