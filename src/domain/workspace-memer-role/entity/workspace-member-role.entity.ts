import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';
import { Role } from '../../role/entity/role.entity';

@Entity({ tableName: 'workspace_member_roles' })
@Unique({ properties: ['workspaceMember', 'role'] })
export class WorkspaceMemberRole extends BaseEntity {
  @ManyToOne(() => WorkspaceMember)
  workspaceMember!: WorkspaceMember;

  @ManyToOne(() => Role)
  role!: Role;
}
