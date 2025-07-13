import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SortRequest {
  @ApiPropertyOptional({
    description: '정렬 옵션 (예: createdAt:DESC,name:ASC)',
    example: 'createdAt:DESC',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]+(:(ASC|DESC))?(,[a-zA-Z0-9]+(:(ASC|DESC))?)*$/, {
    message: '정렬 형식은 field:ASC 또는 field:DESC 형태여야 합니다.',
  })
  @Transform(({ value }) => value || 'createdAt:DESC')
  sort?: string = 'createdAt:DESC';

  get orderBy(): Record<string, 'ASC' | 'DESC'> {
    if (!this.sort) {
      return { createdAt: 'DESC' };
    }

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};

    this.sort.split(',').forEach((item) => {
      const [field, direction = 'ASC'] = item.split(':');
      orderBy[field] = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    });

    return orderBy;
  }
}
