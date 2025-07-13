/**
 * 에러 코드 열거형
 *
 * 애플리케이션에서 사용하는 모든 에러 코드를 정의합니다.
 * 각 코드는 카테고리별로 그룹화되어 있으며, 숫자 코드로 식별됩니다.
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
 * // 개발자가 사용할 때는 의미있는 이름으로
 * throw new AppException(ErrorCode.AUTH_UNAUTHORIZED);
 *
 * // API 응답에서는 숫자 코드로 나타남
 * { "code": "AUTH_001", "message": "로그인이 필요합니다" }
 * ```
 */
export enum ErrorCode {
  // =================
  // 인증/권한 관련 (001~099)
  // =================
  AUTH_UNAUTHORIZED = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_FORBIDDEN = 'AUTH_003',

  // =================
  // 입력값 검증 관련 (001~099)
  // =================
  VALIDATION_FAILED = 'VAL_001',
  VALIDATION_INVALID_INPUT = 'VAL_002',
  VALIDATION_INVALID_PARAM = 'VAL_003',

  // =================
  // 리소스 CRUD 관련 (001~099)
  // =================
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_DUPLICATE = 'RES_002',

  // =================
  // 비즈니스 로직 관련 (001~099)
  // =================
  BUSINESS_INSUFFICIENT_FUNDS = 'BIZ_001',
  BUSINESS_PAYMENT_FAILED = 'BIZ_002',
  BUSINESS_ORDER_ALREADY_PROCESSED = 'BIZ_003',
  BUSINESS_PRODUCT_OUT_OF_STOCK = 'BIZ_004',
  BUSINESS_USER_QUOTA_EXCEEDED = 'BIZ_005',
  BUSINESS_SUBSCRIPTION_REQUIRED = 'BIZ_006',
  BUSINESS_INVALID_COUPON = 'BIZ_007',
  BUSINESS_INVALID_TRANSACTION = 'BIZ_008',

  // =================
  // 외부 서비스 연동 관련 (001~099)
  // =================
  EXTERNAL_API_ERROR = 'EXT_001',
  EXTERNAL_DATABASE_ERROR = 'EXT_002',

  // =================
  // 시스템/서버 관련 (001~099)
  // =================
  SYSTEM_INTERNAL_ERROR = 'SYS_001',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYS_002',
}
