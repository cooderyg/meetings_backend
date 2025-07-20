import { Entity, Property, OneToOne, ManyToOne, Index } from '@mikro-orm/core';
import { TimestampedEntity } from '../../../shared/entity/timestamped.entity';
import { Resource } from '../../resource/entity/resource.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';

@Entity({ tableName: 'spaces' })
export class Space extends TimestampedEntity {
  @OneToOne(() => Resource, { primary: true, fieldName: 'id' })
  @Index()
  resource!: Resource;

  @ManyToOne(() => Workspace)
  @Index()
  workspace!: Workspace;

  @Property({ type: 'text', nullable: true })
  description?: string;
}
