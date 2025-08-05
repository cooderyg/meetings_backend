import { Injectable } from '@nestjs/common';
import { SystemRole } from './enum/system-role.enum';
import { RoleRepository } from './role.repository';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async create() {}

  async update() {}

  async delete() {}

  async findOne(id: number) {}

  async findOneSystemRole(name: SystemRole) {
    return await this.roleRepository.findOneSystemRole(name);
  }

  async findSystemRoles(role: SystemRole) {
    return this.roleRepository.findOneSystemRole(role);
  }
}
