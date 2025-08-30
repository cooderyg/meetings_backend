import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ description: '전체 항목 수', example: 100 })
  totalCount: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 10 })
  limit: number;

  @ApiProperty({ description: '전체 페이지 수', example: 10 })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부', example: false })
  hasPrevious: boolean;
}

export class PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], totalCount: number, page: number, limit: number) {
    this.data = data;
    
    const totalPages = Math.ceil(totalCount / limit);
    
    this.meta = {
      totalCount,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}