import {
  Entity,
  Property,
  ManyToOne,
  Index,
  PrimaryKey,
  Unique,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { ApiProperty } from '@nestjs/swagger';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Space } from '../../space/entity/space.entity';
import { Role } from '../../role/entity/role.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';
import { InvitationStatus } from '../enum/invitation-status.enum';

@Entity({ tableName: 'invitations' })
@Unique({ properties: ['workspace', 'space', 'inviteeEmail', 'status'] })
@Index({ properties: ['inviteeEmail', 'status'] })
@Index({ properties: ['token'] })
export class Invitation extends TimestampedEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => Workspace)
  @Index()
  @ApiProperty({ description: '초대가 속한 워크스페이스 (필수)' })
  workspace!: Workspace;

  @ManyToOne(() => Space, { nullable: true })
  @Index()
  @ApiProperty({
    description: '초대가 속한 스페이스 (선택, NULL이면 워크스페이스 초대)',
    nullable: true,
  })
  space: Space | null = null;

  @Property({ length: 255 })
  @ApiProperty({
    description: '초대받는 사람의 이메일',
    example: 'invitee@example.com',
  })
  inviteeEmail!: string;

  @ManyToOne(() => Role)
  @ApiProperty({ description: '부여할 권한' })
  role!: Role;

  @Property({ type: 'string', default: InvitationStatus.PENDING })
  @ApiProperty({
    description: '초대 상태',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status: InvitationStatus = InvitationStatus.PENDING;

  @Property({ type: 'uuid', unique: true })
  @ApiProperty({
    description: '초대 링크용 고유 토큰',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  token: string = v4();

  @Property({ type: 'timestamptz' })
  @ApiProperty({
    description: '초대 만료 시간',
    example: '2025-12-31T23:59:59Z',
  })
  expiresAt!: Date;

  @ManyToOne(() => WorkspaceMember)
  @ApiProperty({ description: '초대를 생성한 워크스페이스 멤버' })
  inviter!: WorkspaceMember;

  /**
   * 워크스페이스 초대인지 확인
   */
  isWorkspaceInvitation(): boolean {
    return this.space === null;
  }

  /**
   * 스페이스 초대인지 확인
   */
  isSpaceInvitation(): boolean {
    return this.space !== null;
  }

  /**
   * 초대가 만료되었는지 확인
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * 초대를 수락할 수 있는지 확인
   */
  canAccept(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }
}
