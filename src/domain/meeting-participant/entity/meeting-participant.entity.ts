import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';

@Entity({ tableName: 'meeting_participants' })
export class MeetingParticipant extends BaseEntity {
  @Property({ type: 'varchar', nullable: true })
  guestName: string | null = null;

  @ManyToOne({ nullable: true })
  workspaceMember: WorkspaceMember | null = null;

  @ManyToOne()
  meeting: Meeting;
}
