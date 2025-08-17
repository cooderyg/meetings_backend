import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Meeting } from './entity/meeting.entity';
import { MeetingCreate, MeetingUpdate } from './meeting.type';

@Injectable()
export class MeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private repository: EntityRepository<Meeting>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(data: MeetingCreate) {
    const entity = this.repository.assign(new Meeting(), data);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async update(id: string, data: MeetingUpdate) {
    const entity = this.em.getReference(Meeting, id);
    const updateEntity = this.repository.assign(entity, data);
    await this.em.persistAndFlush(updateEntity);
    return entity;
  }

  async delete(id: string) {
    const entity = this.em.getReference(Meeting, id);
    const deleteEntity = this.repository.assign(entity, {
      deletedAt: new Date(),
    });
    await this.em.persistAndFlush(deleteEntity);
    return entity;
  }

  async findById(id: string) {
    return this.repository.findOne({ resource: id, deletedAt: null });
  }
}
