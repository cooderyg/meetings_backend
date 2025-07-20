import { Entity, Property, ManyToOne, Index, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../workspace/entity/workspace-member.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

export enum MeetingVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity({ tableName: 'meetings' })
export class Meeting extends BaseEntity {
  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  @ManyToOne(() => WorkspaceMember)
  @Index()
  owner!: WorkspaceMember;

  @Property({ length: 255 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  content?: string;

  @Enum({ items: () => MeetingVisibility, default: MeetingVisibility.PUBLIC })
  visibility: MeetingVisibility = MeetingVisibility.PUBLIC;

  @Property({ type: LTreeType })
  @Index({ type: 'gist' })
  resourcePath!: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: {
    icon?: string;
    color?: string;
    tags?: string[];
  };

  isOwnedBy(memberId: string): boolean {
    return this.owner.id === memberId;
  }

  isPrivate(): boolean {
    return this.visibility === MeetingVisibility.PRIVATE;
  }

  isPublic(): boolean {
    return this.visibility === MeetingVisibility.PUBLIC;
  }

  getParentId(): string | null {
    const parts = this.resourcePath.split('.');
    if (parts.length <= 1) return null;
    return parts[parts.length - 2];
  }
}
