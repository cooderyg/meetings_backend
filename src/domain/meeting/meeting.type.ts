/* eslint-disable */
import { Meeting } from './entity/meeting.entity';
import { Resource } from '../resource/entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';

export interface MeetingUpdate
  extends Pick<Partial<Meeting>, 'memo' | 'status' | 'tags' | 'summary'> {}

export interface MeetingCreate
  extends Pick<Meeting, 'memo' | 'status' | 'tags' | 'summary'> {
  resource: Resource;
  workspace: Workspace;
}
