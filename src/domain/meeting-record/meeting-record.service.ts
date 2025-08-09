import { Injectable } from '@nestjs/common';
import { MeetingRecordCreate } from './meeting-record.type';
import { MeetingRecordRepository } from './meeting-record.repository';

@Injectable()
export class MeetingRecordService {
  constructor(private repository: MeetingRecordRepository) {}

  async create(data: MeetingRecordCreate) {
    return this.repository.create(data);
  }

  async findByMeeting(meetingId: string) {
    return this.repository.findByMeeting(meetingId);
  }
}
