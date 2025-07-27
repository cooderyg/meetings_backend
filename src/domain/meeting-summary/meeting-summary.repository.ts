import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MeetingSummary } from './entity/meeting-summary.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { MeetingSummaryCreate } from './meeting-summary.type';

@Injectable()
export class MeetingSummaryRepository {
  private em: EntityManager;

  constructor(
    @InjectRepository(MeetingSummary)
    private repository: EntityRepository<MeetingSummary>
  ) {
    this.em = repository.getEntityManager();
  }

  create(data: MeetingSummaryCreate) {
    const resource = this.repository.assign(new MeetingSummary(), data);
    this.repository.create(resource);
    this.em.persist(resource);
    return resource;
  }
}
