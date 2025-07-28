import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Permission } from '../../../domain/permission/entity/permission.entity';
import { RolePermission } from '../../../domain/permission/entity/role-permission.entity';
import {
  SYSTEM_ROLE_DESCRIPTIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '../../../domain/role/const/system-role-permissions.constant';
import { Role } from '../../../domain/role/entity/role.entity';
import { SystemRole } from '../../../domain/role/enum/system-role.enum';

export class SystemRoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await this.migrateGuestRoles(em);
    await this.createSystemRoles(em);
    await this.assignPermissionsToRoles(em);
  }

  private async createSystemRoles(em: EntityManager): Promise<void> {
    for (const [roleName, description] of Object.entries(
      SYSTEM_ROLE_DESCRIPTIONS
    )) {
      const existingRole = await em.findOne(Role, {
        name: roleName,
        workspace: null,
      });

      if (!existingRole) {
        const role = Role.createSystemRole(roleName as SystemRole, description);
        em.persist(role);
        console.log(`Created system role: ${roleName}`);
      } else {
        console.log(`System role already exists: ${roleName}`);
      }
    }

    await em.flush();
  }

  private async assignPermissionsToRoles(em: EntityManager): Promise<void> {
    for (const [roleName, permissionRules] of Object.entries(
      SYSTEM_ROLE_PERMISSIONS
    )) {
      const role = await em.findOne(Role, {
        name: roleName,
        workspace: null,
      });

      if (!role) {
        console.warn(`System role not found: ${roleName}`);
        continue;
      }

      for (const rule of permissionRules) {
        const permission = await em.findOne(Permission, {
          action: rule.action,
          resourceSubject: rule.subject,
        });

        if (!permission) {
          console.warn(`Permission not found: ${rule.action}:${rule.subject}`);
          continue;
        }

        const existingRolePermission = await em.findOne(RolePermission, {
          role,
          permission,
        });

        if (!existingRolePermission) {
          const rolePermission = new RolePermission();
          rolePermission.role = role;
          rolePermission.permission = permission;
          em.persist(rolePermission);
          console.log(
            `Assigned permission ${rule.action}:${rule.subject} to role ${roleName}`
          );
        }
      }
    }

    await em.flush();
  }

  private async migrateGuestRoles(em: EntityManager): Promise<void> {
    const guestRoles = await em.find(Role, {
      name: 'Guest',
      workspace: null,
    });

    for (const guestRole of guestRoles) {
      console.log(
        `Migrating Guest role (ID: ${guestRole.id}) to CAN_VIEW role`
      );
      guestRole.name = SystemRole.CAN_VIEW;
      guestRole.description = SYSTEM_ROLE_DESCRIPTIONS[SystemRole.CAN_VIEW];
      em.persist(guestRole);
    }

    if (guestRoles.length > 0) {
      await em.flush();
      console.log(`Migrated ${guestRoles.length} Guest roles to CAN_VIEW`);
    }
  }
}
