import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Meeting } from '../../meeting/entity/meeting.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';

@Entity({ tableName: 'meeting_participants' })
export class MeetingParticipant extends BaseEntity {
  @Property({ type: 'varchar', nullable: true })
  @ApiProperty({
    description: '게스트 참여자 이름',
    example: '홍길동',
    required: false,
    nullable: true
  })
  guestName: string | null = null;

  @ManyToOne({ nullable: true })
  @ApiProperty({
    description: '워크스페이스 멤버 정보',
    required: false,
    nullable: true
  })
  workspaceMember: WorkspaceMember | null = null;

  @ManyToOne()
  @ApiProperty({
    description: '참여 중인 미팅'
  })
  meeting: Meeting;
}
