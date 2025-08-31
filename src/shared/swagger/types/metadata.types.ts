/**
 * Swagger 메타데이터 타입 정의
 */
export interface EntityFieldInfo {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  format?:
    | 'uuid'
    | 'date-time'
    | 'email'
    | 'url'
    | 'password'
    | 'byte'
    | 'binary';
  description?: string;
  example?: any;
  enum?: readonly any[];
  nullable?: boolean;
  isArray?: boolean;
  items?: {
    type: string;
    format?: string;
  };
}

/**
 * 엔티티별 메타데이터 구조
 */
export type EntityMetadata = Record<string, EntityFieldInfo>;

/**
 * 전체 메타데이터 컬렉션
 */
export type MetadataCollection = Record<string, EntityMetadata>;

/**
 * Enum 추출 유틸리티 타입
 */
export type EnumValues<T extends Record<string | number, string | number>> =
  T[keyof T][];

/**
 * 메타데이터 검증 결과
 */
export interface ValidationResult {
  entityName: string;
  missingFields: string[];
  extraFields: string[];
  isValid: boolean;
}
