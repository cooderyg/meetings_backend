import { Injectable } from '@nestjs/common';
import { MeetingParticipantRepository } from './meeting-participant.repository';

@Injectable()
export class MeetingParticipantService {
  constructor(private readonly repository: MeetingParticipantRepository) {}

  create() {}

  delete() {}
}
