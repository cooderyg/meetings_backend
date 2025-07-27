import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { User } from '../../user/entity/user.entity';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';

@Entity({ tableName: 'meeting_participants' })
export class MeetingParticipant extends BaseEntity {
  @Property({ type: 'varchar', nullable: true })
  guestName: string | null = null;

  @ManyToOne({ nullable: true })
  user: User | null = null;

  @ManyToOne()
  meeting: Meeting;
}
