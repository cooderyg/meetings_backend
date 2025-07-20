import { Entity, Property, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { TenantMember } from './tenant-member.entity';
import { Role } from '../../role/entity/role.entity';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { MemberResourcePermission } from '../../permission/entity/member-resource-permission.entity';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

@Entity({ tableName: 'tenants' })
export class Tenant extends BaseEntity {
  @Property({ length: 255 })
  name!: string;

  @Enum({ items: () => SubscriptionTier, default: SubscriptionTier.FREE })
  subscriptionTier: SubscriptionTier = SubscriptionTier.FREE;

  @OneToMany(() => TenantMember, member => member.tenant)
  members = new Collection<TenantMember>(this);

  @OneToMany(() => Role, role => role.tenant)
  roles = new Collection<Role>(this);

  @OneToMany(() => Meeting, meeting => meeting.tenant)
  meetings = new Collection<Meeting>(this);

  @OneToMany(() => MemberResourcePermission, urp => urp.tenant)
  memberResourcePermissions = new Collection<MemberResourcePermission>(this);
}