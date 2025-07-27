import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { User } from '../../user/entity/user.entity';
import { Meeting } from '../../meeting/entity/meeting.entity';

@Entity({ tableName: 'meeting_participants' })
export class MeetingParticipant extends TimestampedEntity {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ type: 'varchar', nullable: true })
  guestName: string | null = null;

  @ManyToOne({ nullable: true })
  user: User | null = null;

  @ManyToOne()
  meeting: Meeting;
}
