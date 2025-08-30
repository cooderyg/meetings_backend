import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Resource } from '../../resource/entity/resource.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { MeetingRecord } from '../../meeting-record/entity/meeting-record.entity';
import { MeetingParticipant } from '../../meeting-participant/entity/meeting-participant.entity';

export enum MeetingStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  PUBLISHED = 'PUBLISHED',
}

@Entity({ tableName: 'meetings' })
export class Meeting extends TimestampedEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @OneToOne(() => Resource, {
    eager: false,
    nullable: false,
  })
  @Index()
  resource!: Resource;

  @Enum(() => MeetingStatus)
  status: MeetingStatus = MeetingStatus.DRAFT;

  @Property({ type: 'varchar[]' })
  tags: string[] = [];

  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  @Property({ type: 'text', nullable: true })
  memo: string | null = null;

  @Property({ type: 'text', nullable: true })
  summary: string | null = null;

  @Property({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null = null;

  @OneToMany(() => MeetingRecord, (record) => record.meeting)
  records = new Collection<MeetingRecord>(this);

  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting)
  participants = new Collection<MeetingParticipant>(this);
}
