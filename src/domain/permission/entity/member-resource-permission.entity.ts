import { Entity, Property, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { TenantMember } from '../../tenant/entity/tenant-member.entity';
import { Tenant } from '../../tenant/entity/tenant.entity';
import { Permission } from './permission.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

@Entity({ tableName: 'member_resource_permissions' })
@Unique({ properties: ['tenantMember', 'permission', 'resourcePath'] })
@Index({ properties: ['tenantMember', 'tenant'] })
export class MemberResourcePermission extends BaseEntity {

  @ManyToOne(() => TenantMember)
  tenantMember!: TenantMember;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

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