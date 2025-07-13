import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

type ClassConstructor<T = {}> = new (...args: any[]) => T;

// 에러 스키마
export class ErrorResponse {
  @ApiProperty({ example: 'ERR_001' })
  code: string;

  @ApiProperty({ example: '오류가 발생했습니다.' })
  message: string;

  @ApiPropertyOptional({ example: { field: 'name', issue: 'required' } })
  details?: any;
}

// 페이지네이션 메타 스키마
export class PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

// 메타 스키마
export class ResponseMeta {
  @ApiPropertyOptional({ type: PaginationMeta })
  pagination?: PaginationMeta;
}

// 공통 응답 스키마 속성
const getBaseSchema = (): Record<string, any> => ({
  success: { type: 'boolean', example: true },
  error: { $ref: getSchemaPath(ErrorResponse), nullable: true },
});

// StandardResponse를 위한 Swagger 데코레이터
export const ApiStandardResponse = <T extends ClassConstructor>(
  model?: T,
  options?: { isArray?: boolean; hasPagination?: boolean },
) => {
  const baseSchema = getBaseSchema();

  // pagination이 있는 경우 pagination 필드 추가
  if (options?.hasPagination) {
    baseSchema.pagination = { $ref: getSchemaPath(PaginationMeta) };
  }

  if (model) {
    const dataSchema = options?.isArray
      ? { type: 'array', items: { $ref: getSchemaPath(model) } }
      : { $ref: getSchemaPath(model) };

    return applyDecorators(
      ApiOkResponse({
        schema: {
          properties: {
            ...baseSchema,
            data: dataSchema,
          },
        },
      }),
    );
  } else {
    return applyDecorators(
      ApiOkResponse({
        schema: {
          properties: baseSchema,
        },
      }),
    );
  }
};

// 에러 응답 데코레이터
export const ApiErrorResponse = () => {
  return applyDecorators(
    ApiBadRequestResponse({
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          data: { nullable: true },
          error: { $ref: getSchemaPath(ErrorResponse) },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          data: { nullable: true },
          error: { $ref: getSchemaPath(ErrorResponse) },
        },
      },
    }),
  );
};
