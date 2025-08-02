import {
  Entity,
  Property,
  OneToMany,
  Collection,
  Unique,
  Enum,
} from '@mikro-orm/core';
import { RolePermission } from './role-permission.entity';
import { MemberResourcePermission } from './member-resource-permission.entity';

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum ResourceSubject {
  ALL = 'all',
  MEETING = 'Meeting',
  SPACE = 'Space',
  RESOURCE = 'Resource', // Space+Meeting 통합 권한용
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

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions = new Collection<RolePermission>(this);

  @OneToMany(() => MemberResourcePermission, (urp) => urp.permission)
  memberResourcePermissions = new Collection<MemberResourcePermission>(this);

  toString(): string {
    return `${this.action}:${this.resourceSubject}`;
  }

  /**
   * 특정 액션과 리소스 타입과 일치하는지 확인
   */
  matches(action: Action, resourceSubject: ResourceSubject): boolean {
    return this.action === action && this.resourceSubject === resourceSubject;
  }

  /**
   * MANAGE 권한인지 확인 (모든 액션을 포괄)
   */
  isManagePermission(): boolean {
    return this.action === Action.MANAGE;
  }

  /**
   * ALL 리소스 권한인지 확인 (모든 리소스를 포괄)
   */
  isAllResourcePermission(): boolean {
    return this.resourceSubject === ResourceSubject.ALL;
  }

  /**
   * 요청된 권한을 포괄하는지 확인
   */
  covers(action: Action, resourceSubject: ResourceSubject): boolean {
    const actionMatches = this.action === action || this.isManagePermission();
    const resourceMatches =
      this.resourceSubject === resourceSubject ||
      this.isAllResourcePermission();

    return actionMatches && resourceMatches;
  }
}
