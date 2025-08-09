import { Meeting } from './entity/meeting.entity';

export interface MeetingUpdate
  extends Pick<Partial<Meeting>, 'memo' | 'status' | 'tags' | 'summary'> {}
