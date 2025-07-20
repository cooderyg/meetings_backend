import { Entity, Property, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from '../../workspace/entity/workspace-member.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Permission } from './permission.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

@Entity({ tableName: 'member_resource_permissions' })
@Unique({ properties: ['workspaceMember', 'permission', 'resourcePath'] })
@Index({ properties: ['workspaceMember', 'workspace'] })
export class MemberResourcePermission extends BaseEntity {

  @ManyToOne(() => WorkspaceMember)
  workspaceMember!: WorkspaceMember;

  @ManyToOne(() => Workspace)
  workspace!: Workspace;

  @ManyToOne(() => Permission)
  permission!: Permission;

  @Property({ type: LTreeType })
  @Index({ type: 'gist' })
  resourcePath!: string;

  @Property({ default: true })
  isAllowed: boolean = true;

  @Property({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  isActive(): boolean {
    return this.isAllowed && !this.isExpired();
  }
}