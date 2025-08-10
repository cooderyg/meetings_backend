import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { User } from './entity/user.entity';

@Injectable()
export class UserRepository {
  em: EntityManager;

  constructor(
    @InjectRepository(User)
    private readonly repository: EntityRepository<User>
  ) {
    this.em = repository.getEntityManager();
  }

  async findById(id: string) {
    return this.em.findOne(User, { id });
  }

  async findByUid(uid: string) {
    return this.em.findOne(User, { uid });
  }

  async findByEmail(email: string) {
    return this.em.findOne(User, { email });
  }

  async updateUser(user: User) {
    await this.em.persistAndFlush(user);
  }
}
