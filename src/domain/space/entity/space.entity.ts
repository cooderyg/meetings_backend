import { Entity, Property, OneToOne, ManyToOne, Index, PrimaryKey } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Resource } from '../../resource/entity/resource.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';

@Entity({ tableName: 'spaces' })
export class Space extends TimestampedEntity {
  /** 스페이스 ID */
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  /** 리소스 (메타데이터) */
  @OneToOne(() => Resource, {
    eager: false,
    nullable: false,
  })
  @Index()
  resource!: Resource;

  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  @Property({ type: 'text', nullable: true })
  description: string | null = null;
}
