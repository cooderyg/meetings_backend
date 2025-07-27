import { Entity, Property, ManyToOne, Index, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

export enum ResourceType {
  SPACE = 'space',
  MEETING = 'meeting',
}

export enum ResourceVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity({ tableName: 'resources' })
export class Resource extends BaseEntity {
  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  @ManyToOne(() => WorkspaceMember)
  @Index()
  owner!: WorkspaceMember;

  @Enum({ items: () => ResourceType })
  @Index()
  type!: ResourceType;

  @Property({ length: 255 })
  title!: string;

  @Enum({ items: () => ResourceVisibility, default: ResourceVisibility.PUBLIC })
  visibility: ResourceVisibility = ResourceVisibility.PUBLIC;

  @Property({ type: LTreeType })
  @Index({ type: 'gist' })
  path!: string;

  // 계층 구조는 LTree path로만 관리
  getParentPath(): string | null {
    const parts = this.path.split('.');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('.');
  }

  getDepth(): number {
    return this.path.split('.').length;
  }

  isChildOf(parentPath: string): boolean {
    return this.path.startsWith(parentPath + '.');
  }

  // 타입 검사 메서드들
  isMeeting(): boolean {
    return this.type === ResourceType.MEETING;
  }

  isSpace(): boolean {
    return this.type === ResourceType.SPACE;
  }

  isOwnedBy(memberId: string): boolean {
    return this.owner.id === memberId;
  }

  isPrivate(): boolean {
    return this.visibility === ResourceVisibility.PRIVATE;
  }
}
