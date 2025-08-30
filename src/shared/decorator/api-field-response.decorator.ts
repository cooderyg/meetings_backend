import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiExtraModels } from '@nestjs/swagger';
import { createFieldBasedSchema } from '../util/swagger-schema.util';

export interface ApiFieldResponseOptions {
  /** 배열 응답 여부 */
  isArray?: boolean;
  /** 페이지네이션 totalCount 포함 여부 */
  hasTotalCount?: boolean;
  /** Entity 이름 (스키마 생성용) */
  entityName?: string;
  /** 응답 설명 */
  description?: string;
}

/**
 * 필드 배열을 기반으로 Swagger 응답 스키마를 자동 생성하는 데코레이터
 */
export function ApiFieldResponse(
  fields: readonly string[],
  options: ApiFieldResponseOptions = {}
) {
  const {
    isArray = false,
    hasTotalCount = false,
    entityName = 'Meeting', // 기본값
    description
  } = options;

  // 기본 스키마 생성
  const baseSchema = createFieldBasedSchema(fields, entityName);

  let responseSchema: any;

  if (hasTotalCount) {
    // 페이지네이션 응답
    responseSchema = {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: baseSchema
        },
        totalCount: {
          type: 'number',
          description: '전체 항목 수',
          example: 42
        }
      },
      required: ['data', 'totalCount']
    };
  } else if (isArray) {
    // 단순 배열 응답  
    responseSchema = {
      type: 'array',
      items: baseSchema
    };
  } else {
    // 단일 객체 응답
    responseSchema = baseSchema;
  }

  return applyDecorators(
    ApiOkResponse({
      description: description || '성공적으로 조회되었습니다.',
      schema: responseSchema
    })
  );
}

/**
 * Meeting 전용 응답 데코레이터
 */
export function ApiMeetingResponse(
  fields: readonly string[],
  options: Omit<ApiFieldResponseOptions, 'entityName'> = {}
) {
  return ApiFieldResponse(fields, { ...options, entityName: 'Meeting' });
}

/**
 * Space 전용 응답 데코레이터
 */
export function ApiSpaceResponse(
  fields: readonly string[],
  options: Omit<ApiFieldResponseOptions, 'entityName'> = {}
) {
  return ApiFieldResponse(fields, { ...options, entityName: 'Space' });
}