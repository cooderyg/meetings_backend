import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterQuery } from '@mikro-orm/core';

export class FilterRequest {
  @ApiPropertyOptional({
    description: '검색어 (name 필드에 적용)',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '필터 문자열 (예: status:active,createdAt:gt:2023-01-01)',
    example: 'status:active,createdAt:gt:2023-01-01',
  })
  @IsOptional()
  @IsString()
  filter?: string;

  /**
   * 필터 문자열을 파싱하여 MikroORM FilterQuery로 변환
   */
  parseFilters<T extends object>(): FilterQuery<T> {
    const filters: FilterQuery<T> = {};

    // 검색어가 있으면 name 필드에 적용
    if (this.search) {
      filters['name'] = { $like: `%${this.search}%` };
    }

    // 필터 문자열이 없으면 기본 필터 반환
    if (!this.filter) {
      return filters;
    }

    // 필터 문자열 파싱
    this.filter.split(',').forEach((filterItem) => {
      const parts = filterItem.split(':');
      const field = parts[0];

      if (parts.length === 2) {
        // 단순 필터 (예: status:active)
        filters[field] = parts[1];
      } else if (parts.length === 3) {
        // 연산자 필터 (예: createdAt:gt:2023-01-01)
        const operator = parts[1];
        const value = parts[2];

        switch (operator) {
          case 'eq': // 같음
            filters[field] = value;
            break;
          case 'gt': // 보다 큼
            filters[field] = { $gt: value };
            break;
          case 'gte': // 보다 크거나 같음
            filters[field] = { $gte: value };
            break;
          case 'lt': // 보다 작음
            filters[field] = { $lt: value };
            break;
          case 'lte': // 보다 작거나 같음
            filters[field] = { $lte: value };
            break;
          case 'ne': // 같지 않음
            filters[field] = { $ne: value };
            break;
          case 'like': // 포함
            filters[field] = { $like: `%${value}%` };
            break;
          case 'in': // 목록에 포함
            filters[field] = { $in: value.split('|') };
            break;
          default:
            filters[field] = value;
        }
      }
    });

    return filters;
  }
}
