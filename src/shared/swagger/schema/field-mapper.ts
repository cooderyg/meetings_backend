import { EntityFieldInfo } from '../types/metadata.types';

/**
 * Enum 객체에서 값들을 추출하는 유틸리티 함수
 */
export function extractEnumValues<
  T extends Record<string | number, string | number>,
>(enumObj: T): (string | number)[] {
  return Object.values(enumObj);
}

/**
 * Enum을 사용하는 필드 메타데이터를 생성하는 헬퍼 함수
 */
export function createEnumField<
  T extends Record<string | number, string | number>,
>(
  enumObj: T,
  description: string,
  example?: string | number,
  nullable?: boolean
): EntityFieldInfo {
  const enumValues = extractEnumValues(enumObj);
  return {
    type: 'string',
    description,
    enum: enumValues,
    example: example ?? enumValues[0],
    ...(nullable && { nullable }),
  };
}

/**
 * UUID 필드를 위한 헬퍼 함수
 */
export function createUuidField(
  description: string,
  example?: string
): EntityFieldInfo {
  return {
    type: 'string',
    format: 'uuid',
    description,
    example: example ?? '123e4567-e89b-12d3-a456-426614174000',
  };
}

/**
 * 날짜/시간 필드를 위한 헬퍼 함수
 */
export function createDateTimeField(
  description: string,
  nullable?: boolean,
  example?: string
): EntityFieldInfo {
  return {
    type: 'string',
    format: 'date-time',
    description,
    example: example ?? '2025-08-31T09:28:30.974Z',
    ...(nullable && { nullable }),
  };
}

/**
 * 배열 필드를 위한 헬퍼 함수
 */
export function createArrayField(
  itemType: 'string' | 'number',
  description: string,
  example?: any[]
): EntityFieldInfo {
  return {
    type: 'array',
    description,
    isArray: true,
    items: { type: itemType },
    example: example ?? (itemType === 'string' ? ['example'] : [1]),
  };
}

/**
 * 객체 필드를 위한 헬퍼 함수
 */
export function createObjectField(
  description: string,
  example?: any,
  nullable?: boolean
): EntityFieldInfo {
  return {
    type: 'object',
    description,
    example: example ?? {},
    ...(nullable && { nullable }),
  };
}

/**
 * 기본 문자열 필드를 위한 헬퍼 함수
 */
export function createStringField(
  description: string,
  example?: string,
  nullable?: boolean,
  format?: 'email' | 'url' | 'password'
): EntityFieldInfo {
  return {
    type: 'string',
    description,
    example: example ?? 'example',
    ...(nullable && { nullable }),
    ...(format && { format }),
  };
}

/**
 * 숫자 필드를 위한 헬퍼 함수
 */
export function createNumberField(
  description: string,
  example?: number
): EntityFieldInfo {
  return {
    type: 'number',
    description,
    example: example ?? 0,
  };
}

/**
 * 불린 필드를 위한 헬퍼 함수
 */
export function createBooleanField(
  description: string,
  example?: boolean
): EntityFieldInfo {
  return {
    type: 'boolean',
    description,
    example: example ?? true,
  };
}
