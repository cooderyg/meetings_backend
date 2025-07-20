import { Entity, Property, ManyToOne, OneToMany, Collection, Index, Unique } from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../workspace/entity/workspace-member.entity';
import { RolePermission } from '../../permission/entity/role-permission.entity';

@Entity({ tableName: 'roles' })
@Unique({ properties: ['workspace', 'name'] })
export class Role extends TimestampedEntity {
  @Property({ primary: true, autoincrement: true })
  id!: number;

  @ManyToOne(() => Workspace, { nullable: true })
  @Index()
  workspace?: Workspace;

  @Property({ length: 100 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => WorkspaceMember, member => member.role)
  members = new Collection<WorkspaceMember>(this);

  @OneToMany(() => RolePermission, rp => rp.role)
  rolePermissions = new Collection<RolePermission>(this);

  isSystemRole(): boolean {
    return !this.workspace;
  }
}