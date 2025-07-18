import { Entity, Property, ManyToOne, OneToMany, Collection, Index, Unique } from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Tenant } from '../../tenant/entity/tenant.entity';
import { TenantMember } from '../../tenant/entity/tenant-member.entity';
import { RolePermission } from '../../permission/entity/role-permission.entity';

@Entity({ tableName: 'roles' })
@Unique({ properties: ['tenant', 'name'] })
export class Role extends TimestampedEntity {
  @Property({ primary: true, autoincrement: true })
  id!: number;

  @ManyToOne(() => Tenant, { nullable: true })
  @Index()
  tenant?: Tenant;

  @Property({ length: 100 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => TenantMember, member => member.role)
  members = new Collection<TenantMember>(this);

  @OneToMany(() => RolePermission, rp => rp.role)
  rolePermissions = new Collection<RolePermission>(this);

  isSystemRole(): boolean {
    return !this.tenant;
  }
}