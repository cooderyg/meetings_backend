import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { InjectRepository } from '@mikro-orm/nestjs';

@Injectable()
export class MeetingParticipantRepository {
  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly repository: EntityRepository<MeetingParticipant>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  create() {}

  delete() {}
}
