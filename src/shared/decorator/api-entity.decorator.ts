import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { DeepKeys } from '../util/field-selector.util';
import { createFieldBasedSchema } from '../swagger';

export interface ApiEntityOptions {
  /** 응답 설명 */
  description?: string;
  /** 배열 응답 여부 */
  isArray?: boolean;
  /** 페이지네이션 totalCount 포함 여부 */
  paginated?: boolean;
  /** 추가 필드 */
  extend?: Record<
    string,
    {
      type: string;
      format?: string;
      description?: string;
      example?: any;
      nullable?: boolean;
    }
  >;
}

/**
 * 단순화된 엔티티 기반 Swagger 응답 데코레이터
 *
 * @param entityClass 엔티티 클래스
 * @param fields 응답에 포함할 필드 목록 (타입 안전)
 * @param options 추가 옵션
 */
export function ApiEntity<T>(
  entityClass: any,
  fields: readonly DeepKeys<T>[],
  options: ApiEntityOptions = {}
) {
  const {
    description = '성공적으로 처리되었습니다.',
    isArray = false,
    paginated = false,
    extend = {},
  } = options;

  // 기본 스키마 생성
  const baseSchema = createFieldBasedSchema(
    fields as readonly string[],
    entityClass.name
  );

  let responseSchema: any;

  if (paginated) {
    // 페이지네이션 응답
    responseSchema = {
      type: 'object',
      properties: {
        data: { type: 'array', items: baseSchema },
        totalCount: {
          type: 'number',
          description: '전체 항목 수',
          example: 42,
        },
      },
      required: ['data', 'totalCount'],
    };
  } else if (isArray) {
    // 단순 배열 응답
    responseSchema = { type: 'array', items: baseSchema };
  } else {
    // 단일 객체 응답
    responseSchema = baseSchema;
  }

  return applyDecorators(
    ApiOkResponse({
      description,
      schema: responseSchema,
    })
  );
}

/**
 * 페이지네이션 응답 전용 데코레이터
 */
export function ApiEntityPaginated<T>(
  entityClass: any,
  fields: readonly DeepKeys<T>[],
  description = '목록이 성공적으로 조회되었습니다.'
) {
  return ApiEntity(entityClass, fields, {
    description,
    paginated: true,
  });
}

/**
 * 배열 응답 전용 데코레이터
 */
export function ApiEntityArray<T>(
  entityClass: any,
  fields: readonly DeepKeys<T>[],
  description = '목록이 성공적으로 조회되었습니다.'
) {
  return ApiEntity(entityClass, fields, {
    description,
    isArray: true,
  });
}

/**
 * 단일 객체 응답 전용 데코레이터
 */
export function ApiEntitySingle<T>(
  entityClass: any,
  fields: readonly DeepKeys<T>[],
  description = '성공적으로 조회되었습니다.'
) {
  return ApiEntity(entityClass, fields, {
    description,
  });
}

/**
 * 빠른 스키마 생성을 위한 헬퍼 함수
 */
export function quickSchema<T>(
  entityClass: any,
  fields: readonly DeepKeys<T>[],
  options: ApiEntityOptions = {}
) {
  return createFieldBasedSchema(fields as readonly string[], entityClass.name);
}

/**
 * 사용 예시:
 *
 * // 기본 사용법
 * @ApiEntity(Meeting, ['id', 'status', 'resource.title'])
 * async findOne() { ... }
 *
 * // 페이지네이션
 * @ApiEntityPaginated(Meeting, ['id', 'status'])
 * async findAll() { ... }
 *
 * // 확장 필드 포함
 * @ApiEntity(Meeting, ['id', 'status'], {
 *   extend: {
 *     customField: { type: 'string', example: 'example' }
 *   }
 * })
 * async customEndpoint() { ... }
 *
 * // 체이닝 스타일 (고급)
 * @ApiOkResponse({
 *   schema: createSchema<Meeting>(Meeting)
 *     .pick(['id', 'status'])
 *     .extend({ totalCount: { type: 'number', example: 42 } })
 *     .paginated()
 *     .build()
 * })
 * async advancedEndpoint() { ... }
 */
