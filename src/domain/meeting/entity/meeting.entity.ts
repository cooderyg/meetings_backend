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
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    description: '미팅 고유 식별자',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string = v4();

  @OneToOne(() => Resource, {
    eager: false,
    nullable: false,
  })
  @Index()
  resource!: Resource;

  @Enum(() => MeetingStatus)
  @ApiProperty({
    description: '미팅 진행 상태',
    enum: MeetingStatus,
    example: MeetingStatus.DRAFT
  })
  status: MeetingStatus = MeetingStatus.DRAFT;

  @Property({ type: 'varchar[]' })
  @ApiProperty({
    description: '미팅 태그 목록',
    type: [String],
    example: ['중요', '주간회의', '기획'],
    isArray: true
  })
  tags: string[] = [];

  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  @Property({ type: 'text', nullable: true })
  @ApiProperty({
    description: '미팅 메모',
    example: '이번 회의는 중요한 안건을 다룹니다.',
    required: false,
    nullable: true
  })
  memo: string | null = null;

  @Property({ type: 'text', nullable: true })
  @ApiProperty({
    description: 'AI 생성 미팅 요약',
    example: '회의에서 논의된 주요 안건과 결정 사항입니다.',
    required: false,
    nullable: true
  })
  summary: string | null = null;

  @Property({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null = null;

  @OneToMany(() => MeetingRecord, (record) => record.meeting)
  records = new Collection<MeetingRecord>(this);

  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting)
  participants = new Collection<MeetingParticipant>(this);
}
