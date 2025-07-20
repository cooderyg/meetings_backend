import { Entity, Property, ManyToOne, Index, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { Tenant } from '../../tenant/entity/tenant.entity';
import { TenantMember } from '../../tenant/entity/tenant-member.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

export enum SpaceVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity({ tableName: 'spaces' })
export class Space extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => TenantMember)
  @Index()
  owner!: TenantMember;

  @Property({ length: 255 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => SpaceVisibility, default: SpaceVisibility.PUBLIC })
  visibility: SpaceVisibility = SpaceVisibility.PUBLIC;

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
    return this.visibility === SpaceVisibility.PRIVATE;
  }

  isPublic(): boolean {
    return this.visibility === SpaceVisibility.PUBLIC;
  }

  getParentId(): string | null {
    const parts = this.resourcePath.split('.');
    if (parts.length <= 1) return null;
    return parts[parts.length - 2];
  }
}
