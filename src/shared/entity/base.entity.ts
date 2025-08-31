import { PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { v4 } from 'uuid';

export abstract class BaseEntity {
  @PrimaryKey({ type: 'uuid' })
  @ApiProperty({
    description: '고유 식별자',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string = v4();

  @Property({ type: 'timestamptz', onCreate: () => new Date() })
  @ApiProperty({
    description: '생성일시',
    type: 'string',
    format: 'date-time',
    example: '2025-08-31T09:28:30.974Z',
  })
  createdAt: Date = new Date();

  @Property({
    type: 'timestamptz',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  @ApiProperty({
    description: '수정일시',
    type: 'string',
    format: 'date-time',
    example: '2025-08-31T09:28:30.974Z',
  })
  updatedAt: Date = new Date();
}
