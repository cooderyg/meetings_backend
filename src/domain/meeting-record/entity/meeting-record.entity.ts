import {
  Entity,
  Property,
  OneToOne,
  ManyToOne,
  Index,
  PrimaryKeyProp,
  PrimaryKey,
} from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Resource } from '../../resource/entity/resource.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Meeting } from '../../meeting/entity/meeting.entity';

@Entity({ tableName: 'meeting_records' })
export class MeetingRecord extends TimestampedEntity {
  /** 아이디 */
  @PrimaryKey({ autoincrement: true })
  id: number;

  /** 시간 00:00 */
  @Property({ type: 'time' })
  time!: string;

  /** 내용 */
  @Property({ type: 'text' })
  content: string;

  /** 미팅 */
  @ManyToOne()
  meeting: Meeting;
}
