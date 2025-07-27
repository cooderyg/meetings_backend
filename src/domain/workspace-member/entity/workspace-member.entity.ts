import {
  Entity,
  ManyToOne,
  Property,
  OneToMany,
  Collection,
  Index,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { User } from '../../user/entity/user.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Role } from '../../role/entity/role.entity';
import { MemberResourcePermission } from '../../permission/entity/member-resource-permission.entity';
import { SystemRole } from '../../role/enum/system-role.enum';

@Entity({ tableName: 'workspace_members' })
@Unique({ properties: ['user', 'workspace'] })
@Index({ properties: ['workspace', 'user'] })
export class WorkspaceMember extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Workspace)
  workspace!: Workspace;

  @ManyToOne(() => Role)
  role!: Role;

  @Property({ default: true })
  isActive: boolean = true;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ nullable: true })
  imagePath: string | null = null;

  @OneToMany(() => MemberResourcePermission, (urp) => urp.workspaceMember)
  resourcePermissions = new Collection<MemberResourcePermission>(this);

  getDisplayName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ');
  }

  hasRole(roleName: string): boolean {
    return this.role.name === roleName;
  }

  hasSystemRole(systemRole: SystemRole): boolean {
    return this.role.isSpecificSystemRole(systemRole);
  }

  isOwner(): boolean {
    return this.hasSystemRole(SystemRole.OWNER);
  }

  isAdmin(): boolean {
    return this.hasSystemRole(SystemRole.ADMIN);
  }

  canEdit(): boolean {
    return (
      this.hasSystemRole(SystemRole.CAN_EDIT) ||
      this.isAdmin() ||
      this.isOwner()
    );
  }

  canView(): boolean {
    return this.hasSystemRole(SystemRole.CAN_VIEW) || this.canEdit();
  }
}
