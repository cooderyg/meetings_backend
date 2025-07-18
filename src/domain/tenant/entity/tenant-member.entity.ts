import { Entity, ManyToOne, Property, OneToMany, Collection, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { User } from '../../user/entity/user.entity';
import { Tenant } from './tenant.entity';
import { Role } from '../../role/entity/role.entity';
import { Page } from '../../page/entity/page.entity';
import { MemberResourcePermission } from '../../permission/entity/member-resource-permission.entity';

@Entity({ tableName: 'tenant_members' })
@Unique({ properties: ['user', 'tenant'] })
@Index({ properties: ['tenant', 'user'] })
export class TenantMember extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @ManyToOne(() => Role)
  role!: Role;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  department?: string;

  @Property({ nullable: true })
  jobTitle?: string;

  @OneToMany(() => Page, page => page.owner)
  ownedPages = new Collection<Page>(this);

  @OneToMany(() => MemberResourcePermission, urp => urp.tenantMember)
  resourcePermissions = new Collection<MemberResourcePermission>(this);

  getDisplayName(): string {
    return this.user.name || this.user.email;
  }

  hasRole(roleName: string): boolean {
    return this.role.name === roleName;
  }

  isAdmin(): boolean {
    return this.role.name === 'Admin';
  }
}