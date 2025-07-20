import { USER_MESSAGES } from './error-message.const';


/**
 * 애플리케이션 에러 정의 객체
 *
 * 애플리케이션에서 사용하는 모든 에러를 정의합니다.
 * 각 에러는 카테고리별로 그룹화되어 있으며, 코드, 메시지, HTTP 상태코드를 포함합니다.
 *
 * 카테고리 배정:
 * - AUTH_xxx: 인증/권한 관련 (001~099)
 * - VAL_xxx: 입력값 검증 관련 (001~099)
 * - RES_xxx: 리소스 CRUD 관련 (001~099)
 * - BIZ_xxx: 비즈니스 로직 관련 (001~099)
 * - EXT_xxx: 외부 서비스 연동 관련 (001~099)
 * - SYS_xxx: 시스템/서버 관련 (001~099)
 *
 * @example
 * ```typescript
 * // 사용법
 * throw new AppException(ERROR_CODES.AUTH_UNAUTHORIZED);
 *
 * // API 응답에서는 코드로 나타남
 * { "code": "AUTH_001", "message": "로그인이 필요합니다" }
 * ```
 */
export const ERROR_CODES = {
  // =================
  // 인증/권한 관련 (001~099)
  // =================
  AUTH_UNAUTHORIZED: {
    code: 'AUTH_001',
    message: USER_MESSAGES['AUTH_001'],
    httpStatus: 401,
    logLevel: 'warn' as const,
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_002',
    message: USER_MESSAGES['AUTH_002'],
    httpStatus: 401,
    logLevel: 'warn' as const,
  },
  AUTH_FORBIDDEN: {
    code: 'AUTH_003',
    message: USER_MESSAGES['AUTH_003'],
    httpStatus: 403,
    logLevel: 'warn' as const,
  },

  // =================
  // 입력값 검증 관련 (001~099)
  // =================
  VALIDATION_FAILED: {
    code: 'VAL_001',
    message: USER_MESSAGES['VAL_001'],
    httpStatus: 400,
    logLevel: 'info' as const,
  },
  VALIDATION_INVALID_INPUT: {
    code: 'VAL_002',
    message: USER_MESSAGES['VAL_002'],
    httpStatus: 400,
    logLevel: 'info' as const,
  },
  VALIDATION_INVALID_PARAM: {
    code: 'VAL_003',
    message: USER_MESSAGES['VAL_003'],
    httpStatus: 400,
    logLevel: 'info' as const,
  },

  // =================
  // 리소스 CRUD 관련 (001~099)
  // =================
  RESOURCE_NOT_FOUND: {
    code: 'RES_001',
    message: USER_MESSAGES['RES_001'],
    httpStatus: 404,
    logLevel: 'info' as const,
  },
  RESOURCE_DUPLICATE: {
    code: 'RES_002',
    message: USER_MESSAGES['RES_002'],
    httpStatus: 409,
    logLevel: 'warn' as const,
  },

  // =================
  // 비즈니스 로직 관련 (001~099)
  // =================
  BUSINESS_INSUFFICIENT_FUNDS: {
    code: 'BIZ_001',
    message: USER_MESSAGES['BIZ_001'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },
  BUSINESS_PAYMENT_FAILED: {
    code: 'BIZ_002',
    message: USER_MESSAGES['BIZ_002'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },
  BUSINESS_ORDER_ALREADY_PROCESSED: {
    code: 'BIZ_003',
    message: USER_MESSAGES['BIZ_003'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },
  BUSINESS_PRODUCT_OUT_OF_STOCK: {
    code: 'BIZ_004',
    message: USER_MESSAGES['BIZ_004'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },
  BUSINESS_USER_QUOTA_EXCEEDED: {
    code: 'BIZ_005',
    message: USER_MESSAGES['BIZ_005'],
    httpStatus: 429,
    logLevel: 'warn' as const,
  },
  BUSINESS_SUBSCRIPTION_REQUIRED: {
    code: 'BIZ_006',
    message: USER_MESSAGES['BIZ_006'],
    httpStatus: 402,
    logLevel: 'warn' as const,
  },
  BUSINESS_INVALID_COUPON: {
    code: 'BIZ_007',
    message: USER_MESSAGES['BIZ_007'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },
  BUSINESS_INVALID_TRANSACTION: {
    code: 'BIZ_008',
    message: USER_MESSAGES['BIZ_008'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },

  // =================
  // 외부 서비스 연동 관련 (001~099)
  // =================
  EXTERNAL_API_ERROR: {
    code: 'EXT_001',
    message: USER_MESSAGES['EXT_001'],
    httpStatus: 502,
    logLevel: 'error' as const,
  },
  EXTERNAL_DATABASE_ERROR: {
    code: 'EXT_002',
    message: USER_MESSAGES['EXT_002'],
    httpStatus: 500,
    logLevel: 'error' as const,
  },
  STT_SERVICE_ERROR: {
    code: 'EXT_003',
    message: USER_MESSAGES['EXT_003'],
    httpStatus: 502,
    logLevel: 'error' as const,
  },
  STT_NO_RESULTS: {
    code: 'EXT_004',
    message: USER_MESSAGES['EXT_004'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },
  STT_NO_ALTERNATIVES: {
    code: 'EXT_005',
    message: USER_MESSAGES['EXT_005'],
    httpStatus: 400,
    logLevel: 'warn' as const,
  },

  // =================
  // 시스템/서버 관련 (001~099)
  // =================
  SYSTEM_INTERNAL_ERROR: {
    code: 'SYS_001',
    message: USER_MESSAGES['SYS_001'],
    httpStatus: 500,
    logLevel: 'error' as const,
  },
  SYSTEM_SERVICE_UNAVAILABLE: {
    code: 'SYS_002',
    message: USER_MESSAGES['SYS_002'],
    httpStatus: 503,
    logLevel: 'error' as const,
  },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeDefinition = typeof ERROR_CODES[ErrorCodeKey];
