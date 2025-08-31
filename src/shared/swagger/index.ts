/**
 * Swagger 메타데이터 시스템 - 통합 Export
 */

// Types
export * from './types/metadata.types';

// Field Mappers - 헬퍼 함수들
export * from './schema/field-mapper';

// Schema Builder - 핵심 로직
export * from './schema/schema-builder';

// 개별 메타데이터 (필요시 직접 접근 가능)
export * from './metadata/meeting.metadata';
export * from './metadata/space.metadata';
export * from './metadata/user.metadata';
export * from './metadata/workspace.metadata';
export * from './metadata/auth.metadata';
export * from './metadata/permission.metadata';

// 편의를 위한 re-export
export { FIELD_METADATA, createFieldBasedSchema, validateEntityMetadata, checkMetadataCompleteness } from './schema/schema-builder';