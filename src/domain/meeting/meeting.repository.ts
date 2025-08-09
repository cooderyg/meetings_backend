import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Meeting } from './entity/meeting.entity';
import { MeetingUpdate } from './meeting.type';

@Injectable()
export class MeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private repository: EntityRepository<Meeting>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async update(id: string, data: MeetingUpdate) {
    const entity = this.em.getReference(Meeting, id);
    this.repository.assign(entity, data);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async findById(id: string) {
    return this.repository.findOne({ resource: id, deletedAt: null });
  }
}
