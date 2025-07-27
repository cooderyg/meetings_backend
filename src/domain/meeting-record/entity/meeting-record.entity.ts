import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';

@Entity({ tableName: 'meeting_records' })
export class MeetingRecord extends BaseEntity {
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
