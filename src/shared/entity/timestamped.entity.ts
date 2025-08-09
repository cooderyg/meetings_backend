import { Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';

export abstract class TimestampedEntity {
  @Property({ type: 'timestamptz', onCreate: () => new Date() })
  @ApiProperty({
    description: '생성일자',
    type: Date,
    nullable: false,
  })
  createdAt: Date = new Date();

  @Property({
    type: 'timestamptz',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  @ApiProperty({
    description: '수정일자',
    type: Date,
    nullable: false,
  })
  updatedAt: Date = new Date();
}
