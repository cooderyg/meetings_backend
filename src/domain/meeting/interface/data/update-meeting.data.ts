import { Meeting } from '../../entity/meeting.entity';

export interface UpdateMeetingData
  extends Pick<Partial<Meeting>, 'memo' | 'status' | 'tags' | 'summary'> {}
