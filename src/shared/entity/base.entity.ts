import { Property } from '@mikro-orm/core';

export abstract class BaseEntity {
  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Property({ onUpdate: () => new Date(), defaultRaw: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @Property({ default: true })
  isActive!: boolean;

  @Property({ default: false })
  isDeleted!: boolean;
}
