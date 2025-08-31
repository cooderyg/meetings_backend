import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { MemberResourcePermission } from '../../permission/entity/member-resource-permission.entity';
import { SystemRole } from '../../role/enum/system-role.enum';
import { User } from '../../user/entity/user.entity';
import { WorkspaceMemberRole } from '../../workspace-member-role/entity/workspace-member-role.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { MeetingParticipant } from '../../meeting-participant/entity/meeting-participant.entity';

@Entity({ tableName: 'workspace_members' })
@Unique({ properties: ['user', 'workspace'] })
@Index({ properties: ['workspace', 'user'] })
export class WorkspaceMember extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Workspace)
  workspace!: Workspace;

  @Property({ type: 'boolean', default: true })
  // @ApiProperty({
  //   description: '워크스페이스 멤버 활성화 상태',
  //   type: 'boolean',
  //   example: true
  // })
  isActive: boolean = true;

  @Property()
  @ApiProperty({
    description: '사용자 이름',
    example: '홍길'
  })
  firstName!: string;

  @Property()
  @ApiProperty({
    description: '사용자 성',
    example: '동'
  })
  lastName!: string;

  @Property({ nullable: true })
  @ApiProperty({
    description: '프로필 이미지 경로',
    example: '/images/profile/user123.jpg',
    required: false,
    nullable: true
  })
  imagePath: string | null = null;

  @OneToMany(() => MemberResourcePermission, (urp) => urp.workspaceMember)
  resourcePermissions = new Collection<MemberResourcePermission>(this);

  @OneToMany(() => WorkspaceMemberRole, (wmr) => wmr.workspaceMember)
  workspaceMemberRoles = new Collection<WorkspaceMemberRole>(this);

  @OneToMany(() => MeetingParticipant, (participant) => participant.workspaceMember)
  meetingParticipants = new Collection<MeetingParticipant>(this);

  getDisplayName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ');
  }

  hasSystemRole(systemRole: SystemRole): boolean {
    return this.workspaceMemberRoles
      .getItems()
      .some((wmr) => wmr.role.isSpecificSystemRole(systemRole));
  }

  isOwner(): boolean {
    return this.hasSystemRole(SystemRole.OWNER);
  }

  isAdmin(): boolean {
    return this.hasSystemRole(SystemRole.ADMIN);
  }

  canEdit(): boolean {
    return (
      this.hasSystemRole(SystemRole.CAN_EDIT) ||
      this.isAdmin() ||
      this.isOwner()
    );
  }

  canView(): boolean {
    return this.hasSystemRole(SystemRole.CAN_VIEW) || this.canEdit();
  }
}
