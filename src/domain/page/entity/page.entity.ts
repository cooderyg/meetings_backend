import { Entity, Property, ManyToOne, Index, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { Tenant } from '../../tenant/entity/tenant.entity';
import { TenantMember } from '../../tenant/entity/tenant-member.entity';
import { Space } from '../../space/entity/space.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

export enum PageVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

@Entity({ tableName: 'pages' })
export class Page extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => TenantMember)
  @Index()
  owner!: TenantMember;

  @ManyToOne(() => Space, { nullable: true })
  @Index()
  space?: Space;

  @Property({ length: 255 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  content?: string;

  @Enum({ items: () => PageVisibility, default: PageVisibility.PUBLIC })
  visibility: PageVisibility = PageVisibility.PUBLIC;

  @Property({ type: LTreeType })
  @Index({ type: 'gist' })
  treePath!: string;

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
    return this.visibility === PageVisibility.PRIVATE;
  }

  isPublic(): boolean {
    return this.visibility === PageVisibility.PUBLIC;
  }

  getParentId(): string | null {
    const parts = this.treePath.split('.');
    if (parts.length <= 1) return null;
    return parts[parts.length - 2];
  }
}