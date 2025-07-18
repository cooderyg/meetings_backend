import { Entity, Property, OneToMany, Collection, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { TenantMember } from '../../tenant/entity/tenant-member.entity';

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property()
  @Unique()
  @Index()
  email!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => TenantMember, member => member.user)
  tenantMemberships = new Collection<TenantMember>(this);

  getTenantIds(): string[] {
    return this.tenantMemberships
      .getItems()
      .map(membership => membership.tenant.id);
  }

  isMemberOfTenant(tenantId: string): boolean {
    return this.tenantMemberships
      .getItems()
      .some(membership => membership.tenant.id === tenantId);
  }
}