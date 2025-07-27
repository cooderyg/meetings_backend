import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Meeting } from '../../meeting/entity/meeting.entity';

@Entity({ tableName: 'meeting_summaries' })
export class MeetingSummary extends TimestampedEntity {
  @PrimaryKey({ comment: '아이디', autoincrement: true })
  id: number;

  @Property({ comment: '제목', type: 'varchar' })
  title: string;

  @Property({ comment: '내용', type: 'text' })
  content: string;

  @ManyToOne()
  meeting: Meeting;
}
