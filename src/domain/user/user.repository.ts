import { EntityRepository } from '@mikro-orm/core';
import { User } from './entity/user.entity';

export class UserRepository extends EntityRepository<User> {
  async findById(id: string) {
    return await this.findOne({ id });
  }

  async updateUser(user: User) {
    await this.em.persistAndFlush(user);
  }
}
