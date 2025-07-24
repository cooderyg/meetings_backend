import {
  Entity,
  Property,
  OneToOne,
  ManyToOne,
  Index,
  OneToMany,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Resource } from '../../resource/entity/resource.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { MeetingRecord } from '../../meeting-record/entity/meeting-record.entity';
import { MeetingParticipant } from '../../meeting-participant/entity/meeting-participant.entity';
import { MeetingSummary } from '../../meeting-summary/entity/meeting-summary.entity';

export enum MeetingStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

@Entity({ tableName: 'meetings' })
export class Meeting extends TimestampedEntity {
  /** 리소스 */
  @OneToOne(() => Resource, {
    primary: true,
    fieldName: 'id',
  })
  @Index()
  resource!: Resource;

  /** 상태 */
  @Enum(() => MeetingStatus)
  status: MeetingStatus = MeetingStatus.DRAFT;

  /** 태그 목록 */
  @Property({ type: 'varchar[]', nullable: true })
  tags: string[];

  /** 워크스페이스 */
  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  /** 메모 */
  @Property({ type: 'text', nullable: true })
  memo: string | null = null;

  /** 삭제일자 */
  @Property({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null = null;

  /** 미팅 기록 목록 */
  @OneToMany(() => MeetingRecord, (record) => record.meeting)
  records = new Collection<MeetingRecord>(this);

  /** 미팅 참여자 목록 */
  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting)
  participants = new Collection<MeetingParticipant>(this);

  /** 미팅 요약 목록 */
  @OneToMany(() => MeetingSummary, (summary) => summary.meeting)
  summaries = new Collection<MeetingSummary>(this);
}
