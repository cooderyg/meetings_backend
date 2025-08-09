import { Injectable } from '@nestjs/common';
import { MeetingRepository } from './meeting.repository';
import { MeetingUpdate } from './meeting.type';

@Injectable()
export class MeetingService {
  constructor(private repository: MeetingRepository) {}

  async update(id: string, data: MeetingUpdate) {
    return this.repository.update(id, data);
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }
}
