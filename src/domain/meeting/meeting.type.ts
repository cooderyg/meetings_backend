/* eslint-disable */
import { Meeting } from './entity/meeting.entity';
import { Resource } from '../resource/entity/resource.entity';

interface MeetingId {
  resource: Resource;
}

export interface MeetingUpdate
  extends Pick<Partial<Meeting>, 'memo' | 'status' | 'tags' | 'summary'> {}

export interface MeetingCreate
  extends Pick<Meeting, 'memo' | 'status' | 'tags' | 'summary'>,
    MeetingId {}
