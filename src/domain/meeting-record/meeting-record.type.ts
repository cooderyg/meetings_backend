import { MeetingRecord } from './entity/meeting-record.entity';

export interface MeetingRecordCreate
  extends Pick<MeetingRecord, 'content' | 'time'> {
  meeting: string;
}

export interface MeetingRecordUpdate
  extends Pick<Partial<MeetingRecord>, 'content' | 'time'> {}

export interface MeetingRecordUpsert
  extends Pick<MeetingRecord, 'content' | 'time'> {
  meeting: string;
}
