import {
  Collection,
  Entity,
  Index,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { JsonType } from '@mikro-orm/postgresql';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { MeetingParticipant } from '../../meeting-participant/entity/meeting-participant.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';

export interface UserSettings {
  theme: {
    mode: 'system' | 'light' | 'dark';
  };
}

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property()
  @Unique()
  @Index()
  email!: string;

  @Property()
  @Unique()
  uid!: string; //social login uid

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  lastLoginAt: Date | null = null;

  @Property({ nullable: true })
  imagePath: string | null = null;

  @Property({ type: JsonType })
  settings: UserSettings = { theme: { mode: 'system' } };

  @OneToMany(() => WorkspaceMember, (member) => member.user)
  workspaceMemberships = new Collection<WorkspaceMember>(this);

  @OneToMany(() => MeetingParticipant, (participant) => participant.user)
  meetingParticipants = new Collection<MeetingParticipant>(this);

  getWorkspaceIds(): string[] {
    return this.workspaceMemberships
      .getItems()
      .map((membership) => membership.workspace.id);
  }

  isMemberOfWorkspace(workspaceId: string): boolean {
    return this.workspaceMemberships
      .getItems()
      .some((membership) => membership.workspace.id === workspaceId);
  }
}
