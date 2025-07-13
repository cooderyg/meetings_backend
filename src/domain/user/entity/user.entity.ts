import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';

@Entity()
export class User extends BaseEntity {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  userId!: string;

  @Property()
  email!: string;

  @Property()
  password!: string;

  @Property()
  name!: string;

  @Property({ nullable: true })
  deletedAt?: Date;

  @Index()
  declare isDeleted: boolean;
}
