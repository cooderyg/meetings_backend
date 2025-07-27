import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';

@Entity({ tableName: 'meeting_summaries' })
export class MeetingSummary extends BaseEntity {
  @Property({ comment: '제목', type: 'varchar' })
  title: string;

  @Property({ comment: '내용', type: 'text' })
  content: string;

  @ManyToOne()
  meeting: Meeting;
}
