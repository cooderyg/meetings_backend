import { Entity, Property, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { Role } from '../../role/entity/role.entity';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { MemberResourcePermission } from '../../permission/entity/member-resource-permission.entity';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

@Entity({ tableName: 'workspaces' })
export class Workspace extends BaseEntity {
  @Property({ length: 255 })
  name!: string;

  @Enum({ items: () => SubscriptionTier, default: SubscriptionTier.FREE })
  subscriptionTier: SubscriptionTier = SubscriptionTier.FREE;

  @OneToMany(() => WorkspaceMember, member => member.workspace)
  members = new Collection<WorkspaceMember>(this);

  @OneToMany(() => Role, role => role.workspace)
  roles = new Collection<Role>(this);

  @OneToMany(() => Meeting, meeting => meeting.workspace)
  meetings = new Collection<Meeting>(this);

  @OneToMany(() => MemberResourcePermission, urp => urp.workspace)
  memberResourcePermissions = new Collection<MemberResourcePermission>(this);
}