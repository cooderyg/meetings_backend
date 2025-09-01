import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { InjectRepository } from '@mikro-orm/nestjs';
import { CreateMeetingParticipantData } from './interface/data/create-meeting-participant.data';
import {
  MEETING_PARTICIPANT_DETAIL_FIELDS,
  MEETING_PARTICIPANT_DETAIL_POPULATE,
} from './constant/meeting-participant-fields';

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
    const meetingParticipant = this.repository.assign(
      new MeetingParticipant(),
      data
    );

    await this.em.persistAndFlush(meetingParticipant);

    await this.em.populate(
      meetingParticipant,
      MEETING_PARTICIPANT_DETAIL_POPULATE
    );

    return meetingParticipant;
  }

  async delete(meetingParticipant: MeetingParticipant) {
    await this.em.removeAndFlush(meetingParticipant);
  }

  async findById(id: string) {
    return this.repository.findOne(
      { id },
      {
        populate: MEETING_PARTICIPANT_DETAIL_POPULATE,
      }
    );
  }

  async findByMeetingAndMember(meetingId: string, workspaceMemberId: string) {
    return await this.repository.findOne({
      meeting: meetingId,
      workspaceMember: workspaceMemberId,
    });
  }
}
