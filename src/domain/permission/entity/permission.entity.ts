import { Entity, Property, OneToMany, Collection, Unique, Enum } from '@mikro-orm/core';
import { RolePermission } from './role-permission.entity';
import { MemberResourcePermission } from './member-resource-permission.entity';

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage'
}

export enum ResourceSubject {
  ALL = 'all',
  MEETING = 'Meeting',
  SPACE = 'Space',
  LOGIN_EVENT = 'LoginEvent',
}

@Entity({ tableName: 'permissions' })
@Unique({ properties: ['action', 'resourceSubject'] })
export class Permission {
  @Property({ primary: true, autoincrement: true })
  id!: number;

  @Enum({ items: () => Action })
  action!: Action;

  @Enum({ items: () => ResourceSubject })
  resourceSubject!: ResourceSubject;

  @OneToMany(() => RolePermission, rp => rp.permission)
  rolePermissions = new Collection<RolePermission>(this);

  @OneToMany(() => MemberResourcePermission, urp => urp.permission)
  memberResourcePermissions = new Collection<MemberResourcePermission>(this);

  toString(): string {
    return `${this.action}:${this.resourceSubject}`;
  }
}