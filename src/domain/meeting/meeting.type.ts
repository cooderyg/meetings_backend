/* eslint-disable */
import { Meeting } from './entity/meeting.entity';

interface MeetingId {
  resource: string;
}

export interface MeetingUpdate
  extends Pick<Partial<Meeting>, 'memo' | 'status' | 'tags' | 'summary'> {}

export interface MeetingCreate
  extends Pick<Meeting, 'memo' | 'status' | 'tags' | 'summary'>,
    MeetingId {}
