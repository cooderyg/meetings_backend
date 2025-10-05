import {
  AfterUpdate,
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';

@Entity({ tableName: 'meeting_records' })
export class MeetingRecord extends BaseEntity {
  /** 시간(초) */
  @Property({ type: 'int' })
  time!: number;

  /** 내용 */
  @Property({ type: 'text' })
  content: string;

  /** 미팅 */
  @ManyToOne(() => Meeting)
  meeting: Meeting;
}
