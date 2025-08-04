import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MeetingRecord } from './entity/meeting-record.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import {
  MeetingRecordCreate,
  MeetingRecordUpdate,
  MeetingRecordUpsert,
} from './meeting-record.type';

@Injectable()
export class MeetingRecordRepository {
  constructor(
    @InjectRepository(MeetingRecord)
    private repository: EntityRepository<MeetingRecord>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(data: MeetingRecordCreate) {
    const entity = this.repository.assign(new MeetingRecord(), data);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async update(id: string, data: MeetingRecordUpdate) {
    const entity = this.em.getReference(MeetingRecord, id);
    this.repository.assign(entity, data);
    await this.em.persistAndFlush(entity);
    return entity;
  }
}
