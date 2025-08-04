import { Injectable } from '@nestjs/common';
import { MeetingRecordCreate } from './meeting-record.type';
import { MeetingRecordRepository } from './meeting-record.repository';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MeetingRecordService {
  constructor(private repository: MeetingRecordRepository) {}

  @OnEvent('meeting-record.created')
  async create(data: MeetingRecordCreate) {
    return this.repository.create(data);
  }
}
