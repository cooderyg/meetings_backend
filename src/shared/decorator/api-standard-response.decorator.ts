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

// 공통 응답 스키마 속성
const getBaseSchema = (): Record<string, any> => ({
  success: { type: 'boolean', example: true },
  error: { $ref: getSchemaPath(ErrorResponse), nullable: true },
});

// StandardResponse를 위한 Swagger 데코레이터
export const ApiStandardResponse = <T extends ClassConstructor>(
  model?: T,
  options?: { isArray?: boolean; hasTotalCount?: boolean; isPaginated?: boolean }
) => {
  const baseSchema = getBaseSchema();

  // totalCount가 있는 경우 totalCount 필드 추가
  if (options?.hasTotalCount || options?.isPaginated) {
    baseSchema.totalCount = { type: 'number', example: 100 };
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
      })
    );
  } else {
    return applyDecorators(
      ApiOkResponse({
        schema: {
          properties: baseSchema,
        },
      })
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
    })
  );
};
