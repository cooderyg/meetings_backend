import { Injectable } from '@nestjs/common';
import { MeetingRecordCreate } from './meeting-record.type';
import { MeetingRecordRepository } from './meeting-record.repository';
import { OnEvent } from '@nestjs/event-emitter';
import { MEETING_RECORD_CREATED } from './meeting-record.constant';

@Injectable()
export class MeetingRecordService {
  constructor(private repository: MeetingRecordRepository) {}

  @OnEvent(MEETING_RECORD_CREATED)
  async create(data: MeetingRecordCreate) {
    return this.repository.create(data);
  }
}
