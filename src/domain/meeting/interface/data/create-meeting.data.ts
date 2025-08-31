import { Resource } from '../../../resource/entity/resource.entity';
import { Workspace } from '../../../workspace/entity/workspace.entity';
import { Meeting } from '../../entity/meeting.entity';

export interface CreateMeetingData
  extends Pick<Meeting, 'memo' | 'status' | 'tags' | 'summary'> {
  resource: Resource;
  workspace: Workspace;
}
