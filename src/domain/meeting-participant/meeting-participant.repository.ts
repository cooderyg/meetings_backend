import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { InjectRepository } from '@mikro-orm/nestjs';
import { CreateMeetingParticipantData } from './interface/data/create-meeting-participant.data';
import { extractPopulateFromFields } from '../../shared/util/field.util';
import { MEETING_PARTICIPANT_DETAIL_FIELDS } from './constant/meeting-participant-fields';

@Injectable()
export class MeetingParticipantRepository {
  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly repository: EntityRepository<MeetingParticipant>
  ) {
    this.em = repository.getEntityManager();
  }

  em: EntityManager;

  async create(data: CreateMeetingParticipantData) {
    const meetingParticipant = this.em.assign(new MeetingParticipant(), data);

    await this.em.persistAndFlush(meetingParticipant);

    await this.em.populate(
      meetingParticipant,
      extractPopulateFromFields(MEETING_PARTICIPANT_DETAIL_FIELDS) as any
    );

    return meetingParticipant;
  }

  async delete(meetingParticipant: MeetingParticipant) {
    await this.em.removeAndFlush(meetingParticipant);
  }

  async findById(id: string) {
    return await this.repository.findOne(
      { id },
      {
        populate: extractPopulateFromFields(MEETING_PARTICIPANT_DETAIL_FIELDS) as any,
        fields: MEETING_PARTICIPANT_DETAIL_FIELDS as any,
      }
    );
  }
}
