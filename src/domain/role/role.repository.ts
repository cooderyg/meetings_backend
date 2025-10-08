import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Role } from './entity/role.entity';
import { SystemRole } from './enum/system-role.enum';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repository: EntityRepository<Role>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(role: Role) {
    this.em.persist(role);
    await this.em.flush();
  }

  async findOneSystemRole(name: SystemRole) {
    return await this.repository.findOne({
      name,
      workspace: null,
    });
  }

  async findById(id: number) {
    return await this.repository.findOne({ id });
  }
}
