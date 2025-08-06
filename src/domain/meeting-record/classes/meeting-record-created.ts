import { MeetingRecordCreate } from '../meeting-record.type';

export class MeetingRecordCreated implements MeetingRecordCreate {
  constructor(meeting: string, content: string, time: number) {
    this.meeting = meeting;
    this.content = content;
    this.time = time;
  }
  meeting: string;
  content: string;
  time: number;
}
