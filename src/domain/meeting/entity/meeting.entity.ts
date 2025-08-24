import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryKeyProp,
  Property,
} from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Resource } from '../../resource/entity/resource.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { MeetingRecord } from '../../meeting-record/entity/meeting-record.entity';
import { MeetingParticipant } from '../../meeting-participant/entity/meeting-participant.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum MeetingStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  PUBLISHED = 'PUBLISHED',
}

@Entity({ tableName: 'meetings' })
export class Meeting extends TimestampedEntity {
  [PrimaryKeyProp]?: 'resource';

  /** 리소스 */
  @ApiProperty({
    description: '아이디 (리소스)',
    type: String,
    nullable: false,
  })
  @OneToOne(() => Resource, {
    joinColumn: 'id',
    primary: true,
  })
  @Index()
  resource: Resource;

  /** 상태 */
  @ApiProperty({
    description: '상태',
    enum: MeetingStatus,
    nullable: false,
    default: MeetingStatus.DRAFT,
  })
  @Enum(() => MeetingStatus)
  status: MeetingStatus = MeetingStatus.DRAFT;

  /** 태그 목록 */
  @ApiProperty({
    description: '태그 목록',
    type: [String],
    nullable: false,
  })
  @Property({ type: 'varchar[]' })
  tags: string[] = [];

  /** 워크스페이스 */
  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  /** 메모 */
  @ApiProperty({
    description: '메모',
    type: String,
    nullable: true,
  })
  @Property({ type: 'text', nullable: true })
  memo: string | null = null;

  /** AI 요약 */
  @ApiProperty({
    description: 'AI 요약',
    type: String,
    nullable: true,
  })
  @Property({ type: 'text', nullable: true })
  summary: string | null = null;

  /** 삭제일자 */
  @ApiProperty({
    description: '삭제일자',
    type: Date,
    nullable: true,
  })
  @Property({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null = null;

  /** 미팅 기록 목록 */
  @OneToMany(() => MeetingRecord, (record) => record.meeting)
  records = new Collection<MeetingRecord>(this);

  /** 미팅 참여자 목록 */
  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting)
  participants = new Collection<MeetingParticipant>(this);
}
