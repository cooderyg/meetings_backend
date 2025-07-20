import { Entity, Property, OneToMany, Collection, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from '../../workspace/entity/workspace-member.entity';

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property()
  @Unique()
  @Index()
  email!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => WorkspaceMember, member => member.user)
  workspaceMemberships = new Collection<WorkspaceMember>(this);

  getWorkspaceIds(): string[] {
    return this.workspaceMemberships
      .getItems()
      .map(membership => membership.workspace.id);
  }

  isMemberOfWorkspace(workspaceId: string): boolean {
    return this.workspaceMemberships
      .getItems()
      .some(membership => membership.workspace.id === workspaceId);
  }
}