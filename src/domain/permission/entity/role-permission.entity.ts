import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { Role } from '../../role/entity/role.entity';
import { Permission } from './permission.entity';

@Entity({ tableName: 'role_permissions' })
export class RolePermission {
  @ManyToOne(() => Role, { primary: true })
  role!: Role;

  @ManyToOne(() => Permission, { primary: true })
  permission!: Permission;

  @Property({ type: 'jsonb', nullable: true })
  conditions: Record<string, any> | null = null;
}
