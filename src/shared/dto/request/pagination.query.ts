import { IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQuery {
  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  /**
   * 오프셋 계산 (0부터 시작)
   */
  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}
