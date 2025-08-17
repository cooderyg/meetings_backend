import { Injectable } from '@nestjs/common';
import { MeetingRepository } from './meeting.repository';
import { MeetingCreate, MeetingUpdate } from './meeting.type';

@Injectable()
export class MeetingService {
  constructor(private repository: MeetingRepository) {}

  async create(data: MeetingCreate) {
    return this.repository.create(data);
  }

  async update(id: string, data: MeetingUpdate) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }
}
