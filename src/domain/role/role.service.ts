import { Injectable } from '@nestjs/common';
import { RoleRepository } from './role.repository';
import { SystemRole } from './enum/system-role.enum';

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

  async findByWorkspace(workspaceId: string) {}
}
