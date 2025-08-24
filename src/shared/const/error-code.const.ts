/**
 * 자기 설명적 에러 코드 정의
 *
 * 각 에러 코드는 도메인별로 분류되며, 코드명 자체가 의미를 설명합니다.
 * 클라이언트에서 i18n을 통해 메시지를 처리하므로 서버는 코드와 컨텍스트만 제공합니다.
 *
 * 도메인별 분류:
 * - AUTH_*: 인증/권한 관련
 * - MEETING_*: 미팅 도메인 관련
 * - WORKSPACE_*: 워크스페이스 도메인 관련
 * - RESOURCE_*: 공통 리소스 관련
 * - VALIDATION_*: 입력값 검증 관련
 * - STORAGE_*: 파일 저장소 관련
 * - STT_*: 음성 인식 관련
 * - SYSTEM_*: 시스템/서버 관련
 *
 * @example
 * ```typescript
 * throw new AppException('MEETING_CANNOT_PUBLISH_DRAFT', {
 *   currentStatus: 'DRAFT',
 *   requiredStatus: 'COMPLETED'
 * });
 * 
 * // API 응답
 * {
 *   "error": {
 *     "code": "MEETING_CANNOT_PUBLISH_DRAFT",
 *     "context": {
 *       "currentStatus": "DRAFT",
 *       "requiredStatus": "COMPLETED"
 *     }
 *   }
 * }
 * ```
 */

// 에러 코드 타입 정의
export type ErrorCode =
  // 인증/권한 관련
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_FORBIDDEN'
  
  // 미팅 도메인 관련
  | 'MEETING_CANNOT_PUBLISH_DRAFT'
  | 'MEETING_ALREADY_PUBLISHED'
  | 'MEETING_IN_PROGRESS_CANNOT_DELETE'
  | 'MEETING_COMPLETED_CANNOT_EDIT'
  | 'MEETING_DELETED_CANNOT_ACCESS'
  | 'MEETING_OWNER_REQUIRED'
  | 'MEETING_PARTICIPANT_LIMIT_EXCEEDED'
  | 'MEETING_INVALID_STATUS_TRANSITION'
  | 'MEETING_RECORD_NOT_FOUND'
  | 'MEETING_SUMMARY_GENERATION_FAILED'
  | 'MEETING_TRANSCRIPTION_IN_PROGRESS'
  | 'MEETING_TRANSCRIPTION_FAILED'
  
  // 워크스페이스 도메인 관련
  | 'WORKSPACE_MEMBER_REQUIRED'
  | 'WORKSPACE_ACCESS_DENIED'
  | 'WORKSPACE_OWNER_REQUIRED'
  | 'WORKSPACE_INVITATION_EXPIRED'
  | 'WORKSPACE_MEMBER_LIMIT_EXCEEDED'
  
  // 공통 리소스 관련
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_DUPLICATE'
  | 'RESOURCE_ACCESS_DENIED'
  
  // 입력값 검증 관련
  | 'VALIDATION_FAILED'
  | 'VALIDATION_INVALID_INPUT'
  | 'VALIDATION_INVALID_PARAM'
  
  // 파일 저장소 관련
  | 'STORAGE_UPLOAD_FAILED'
  | 'STORAGE_DOWNLOAD_FAILED'
  | 'STORAGE_DELETE_FAILED'
  | 'STORAGE_FILE_NOT_FOUND'
  | 'STORAGE_PRESIGNED_URL_FAILED'
  | 'STORAGE_CHECK_FAILED'
  
  // 음성 인식 관련
  | 'STT_SERVICE_ERROR'
  | 'STT_NO_RESULTS'
  | 'STT_NO_ALTERNATIVES'
  
  // 시스템/서버 관련
  | 'SYSTEM_INTERNAL_ERROR'
  | 'SYSTEM_SERVICE_UNAVAILABLE'
  | 'EXTERNAL_API_ERROR'
  | 'EXTERNAL_DATABASE_ERROR';

/**
 * 에러 코드별 HTTP 상태코드 및 로그 레벨 정의
 */
export const ERROR_DEFINITIONS: Record<ErrorCode, { httpStatus: number; logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose' }> = {
  // 인증/권한
  AUTH_UNAUTHORIZED: { httpStatus: 401, logLevel: 'warn' },
  AUTH_TOKEN_EXPIRED: { httpStatus: 401, logLevel: 'warn' },
  AUTH_FORBIDDEN: { httpStatus: 403, logLevel: 'warn' },

  // 미팅 도메인
  MEETING_CANNOT_PUBLISH_DRAFT: { httpStatus: 400, logLevel: 'warn' },
  MEETING_ALREADY_PUBLISHED: { httpStatus: 400, logLevel: 'warn' },
  MEETING_IN_PROGRESS_CANNOT_DELETE: { httpStatus: 400, logLevel: 'warn' },
  MEETING_COMPLETED_CANNOT_EDIT: { httpStatus: 400, logLevel: 'warn' },
  MEETING_DELETED_CANNOT_ACCESS: { httpStatus: 404, logLevel: 'warn' },
  MEETING_OWNER_REQUIRED: { httpStatus: 403, logLevel: 'warn' },
  MEETING_PARTICIPANT_LIMIT_EXCEEDED: { httpStatus: 400, logLevel: 'warn' },
  MEETING_INVALID_STATUS_TRANSITION: { httpStatus: 400, logLevel: 'warn' },
  MEETING_RECORD_NOT_FOUND: { httpStatus: 404, logLevel: 'info' },
  MEETING_SUMMARY_GENERATION_FAILED: { httpStatus: 502, logLevel: 'error' },
  MEETING_TRANSCRIPTION_IN_PROGRESS: { httpStatus: 202, logLevel: 'info' },
  MEETING_TRANSCRIPTION_FAILED: { httpStatus: 502, logLevel: 'error' },

  // 워크스페이스 도메인
  WORKSPACE_MEMBER_REQUIRED: { httpStatus: 403, logLevel: 'warn' },
  WORKSPACE_ACCESS_DENIED: { httpStatus: 403, logLevel: 'warn' },
  WORKSPACE_OWNER_REQUIRED: { httpStatus: 403, logLevel: 'warn' },
  WORKSPACE_INVITATION_EXPIRED: { httpStatus: 400, logLevel: 'info' },
  WORKSPACE_MEMBER_LIMIT_EXCEEDED: { httpStatus: 429, logLevel: 'warn' },

  // 공통 리소스
  RESOURCE_NOT_FOUND: { httpStatus: 404, logLevel: 'info' },
  RESOURCE_DUPLICATE: { httpStatus: 409, logLevel: 'warn' },
  RESOURCE_ACCESS_DENIED: { httpStatus: 403, logLevel: 'warn' },

  // 입력값 검증
  VALIDATION_FAILED: { httpStatus: 400, logLevel: 'info' },
  VALIDATION_INVALID_INPUT: { httpStatus: 400, logLevel: 'info' },
  VALIDATION_INVALID_PARAM: { httpStatus: 400, logLevel: 'info' },

  // 파일 저장소
  STORAGE_UPLOAD_FAILED: { httpStatus: 502, logLevel: 'error' },
  STORAGE_DOWNLOAD_FAILED: { httpStatus: 502, logLevel: 'error' },
  STORAGE_DELETE_FAILED: { httpStatus: 502, logLevel: 'error' },
  STORAGE_FILE_NOT_FOUND: { httpStatus: 404, logLevel: 'warn' },
  STORAGE_PRESIGNED_URL_FAILED: { httpStatus: 502, logLevel: 'error' },
  STORAGE_CHECK_FAILED: { httpStatus: 502, logLevel: 'error' },

  // 음성 인식
  STT_SERVICE_ERROR: { httpStatus: 502, logLevel: 'error' },
  STT_NO_RESULTS: { httpStatus: 400, logLevel: 'warn' },
  STT_NO_ALTERNATIVES: { httpStatus: 400, logLevel: 'warn' },

  // 시스템/서버
  SYSTEM_INTERNAL_ERROR: { httpStatus: 500, logLevel: 'error' },
  SYSTEM_SERVICE_UNAVAILABLE: { httpStatus: 503, logLevel: 'error' },
  EXTERNAL_API_ERROR: { httpStatus: 502, logLevel: 'error' },
  EXTERNAL_DATABASE_ERROR: { httpStatus: 500, logLevel: 'error' },
};

// 하위 호환성을 위한 Legacy 상수 (점진적 마이그레이션용)
export const ERROR_CODES = {
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED' as const,
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED' as const,
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN' as const,
  
  MEETING_CANNOT_PUBLISH_DRAFT: 'MEETING_CANNOT_PUBLISH_DRAFT' as const,
  MEETING_ALREADY_PUBLISHED: 'MEETING_ALREADY_PUBLISHED' as const,
  MEETING_IN_PROGRESS_CANNOT_DELETE: 'MEETING_IN_PROGRESS_CANNOT_DELETE' as const,
  MEETING_COMPLETED_CANNOT_EDIT: 'MEETING_COMPLETED_CANNOT_EDIT' as const,
  MEETING_DELETED_CANNOT_ACCESS: 'MEETING_DELETED_CANNOT_ACCESS' as const,
  MEETING_OWNER_REQUIRED: 'MEETING_OWNER_REQUIRED' as const,
  MEETING_PARTICIPANT_LIMIT_EXCEEDED: 'MEETING_PARTICIPANT_LIMIT_EXCEEDED' as const,
  MEETING_INVALID_STATUS_TRANSITION: 'MEETING_INVALID_STATUS_TRANSITION' as const,
  MEETING_RECORD_NOT_FOUND: 'MEETING_RECORD_NOT_FOUND' as const,
  MEETING_SUMMARY_GENERATION_FAILED: 'MEETING_SUMMARY_GENERATION_FAILED' as const,
  MEETING_TRANSCRIPTION_IN_PROGRESS: 'MEETING_TRANSCRIPTION_IN_PROGRESS' as const,
  MEETING_TRANSCRIPTION_FAILED: 'MEETING_TRANSCRIPTION_FAILED' as const,
  
  WORKSPACE_MEMBER_REQUIRED: 'WORKSPACE_MEMBER_REQUIRED' as const,
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED' as const,
  WORKSPACE_OWNER_REQUIRED: 'WORKSPACE_OWNER_REQUIRED' as const,
  WORKSPACE_INVITATION_EXPIRED: 'WORKSPACE_INVITATION_EXPIRED' as const,
  WORKSPACE_MEMBER_LIMIT_EXCEEDED: 'WORKSPACE_MEMBER_LIMIT_EXCEEDED' as const,
  
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND' as const,
  RESOURCE_DUPLICATE: 'RESOURCE_DUPLICATE' as const,
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED' as const,
  
  VALIDATION_FAILED: 'VALIDATION_FAILED' as const,
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT' as const,
  VALIDATION_INVALID_PARAM: 'VALIDATION_INVALID_PARAM' as const,
  
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED' as const,
  STORAGE_DOWNLOAD_FAILED: 'STORAGE_DOWNLOAD_FAILED' as const,
  STORAGE_DELETE_FAILED: 'STORAGE_DELETE_FAILED' as const,
  STORAGE_FILE_NOT_FOUND: 'STORAGE_FILE_NOT_FOUND' as const,
  STORAGE_PRESIGNED_URL_FAILED: 'STORAGE_PRESIGNED_URL_FAILED' as const,
  STORAGE_CHECK_FAILED: 'STORAGE_CHECK_FAILED' as const,
  
  STT_SERVICE_ERROR: 'STT_SERVICE_ERROR' as const,
  STT_NO_RESULTS: 'STT_NO_RESULTS' as const,
  STT_NO_ALTERNATIVES: 'STT_NO_ALTERNATIVES' as const,
  
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR' as const,
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE' as const,
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR' as const,
  EXTERNAL_DATABASE_ERROR: 'EXTERNAL_DATABASE_ERROR' as const,
} as const;

export type ErrorDefinition = typeof ERROR_DEFINITIONS[ErrorCode];