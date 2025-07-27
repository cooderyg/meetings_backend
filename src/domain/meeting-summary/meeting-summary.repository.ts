import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MeetingSummary } from './entity/meeting-summary.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Meeting } from '../meeting/entity/meeting.entity';
import { MeetingSummaryCreate } from './meeting-summary.type';
import { Resource } from '../resource/entity/resource.entity';

@Injectable()
export class MeetingSummaryRepository {
  private em: EntityManager;

  constructor(
    @InjectRepository(MeetingSummary)
    private repository: EntityRepository<MeetingSummary>
  ) {
    this.em = repository.getEntityManager();
  }

  create({ meetingId, ...data }: MeetingSummaryCreate) {
    const resource = this.em.getReference(Resource, meetingId);
    const meeting = this.em.getReference(Meeting, meetingId);
    // const resource = this.repository.assign(new MeetingSummary(), {
    //   ...data,
    //   meeting,
    // });
    // this.repository.create(resource);
    // this.em.persist(resource);
    // return resource;
  }
}
