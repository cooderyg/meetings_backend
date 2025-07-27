import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  Unique,
} from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';
import { RolePermission } from '../../permission/entity/role-permission.entity';
import { SystemRole } from '../enum/system-role.enum';

@Entity({ tableName: 'roles' })
@Unique({ properties: ['workspace', 'name'] })
export class Role extends TimestampedEntity {
  @Property({ primary: true, autoincrement: true })
  id!: number;

  @ManyToOne(() => Workspace, { nullable: true })
  @Index()
  workspace: Workspace | null = null;

  @Property({ length: 100 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description: string | null = null;

  @OneToMany(() => WorkspaceMember, (member) => member.role)
  members = new Collection<WorkspaceMember>(this);

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions = new Collection<RolePermission>(this);

  isSystemRole(): boolean {
    return !this.workspace;
  }

  isSpecificSystemRole(systemRole: SystemRole): boolean {
    return this.isSystemRole() && this.name === systemRole;
  }

  static createSystemRole(name: SystemRole, description?: string): Role {
    const role = new Role();
    role.name = name;
    if (description !== undefined) {
      role.description = description;
    }
    role.workspace = null;
    return role;
  }
}
