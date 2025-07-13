import { ErrorCode } from '../enum/error-code';
import { ErrorDefinition } from '../type/error-definition.types';
import { ERROR_MESSAGES } from './err-message.const';

/**
 * 에러 코드 정의 상수
 *
 * 각 ErrorCode enum 값에 대응하는 에러 정의를 관리합니다.
 * 각 에러는 다음 정보를 포함합니다:
 *
 * - message: 개발자용 내부 메시지 (디버깅/로깅용)
 * - userMessage: 사용자에게 표시할 친화적인 메시지
 * - httpStatus: HTTP 상태 코드
 * - logLevel: 로깅 레벨 ('error' | 'warn' | 'info' | 'debug' | 'verbose')
 *
 * 로깅 레벨 가이드라인:
 * - error: 시스템 전체에 영향을 주는 심각한 오류
 * - warn: 비즈니스 로직 오류, 보안 문제 등
 * - info: 일반적인 오류, 사용자 입력 오류 등
 * - debug: 개발/디버깅용 오류
 * - verbose: 상세한 디버깅 정보
 *
 * @example
 * ```typescript
 * // 사용 예시
 * const errorDef = ERROR_DEFINITIONS[ErrorCode.AUTH_UNAUTHORIZED];
 * console.log(errorDef.httpStatus); // 401
 * console.log(errorDef.userMessage); // "로그인이 필요합니다"
 * ```
 */
export const ERROR_DEFINITIONS: Record<ErrorCode, ErrorDefinition> = {
  // =================
  // 인증/권한 관련 에러
  // =================
  [ErrorCode.AUTH_UNAUTHORIZED]: {
    message: '인증이 필요합니다',
    userMessage: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
    httpStatus: 401,
    logLevel: 'warn',
  },
  [ErrorCode.AUTH_TOKEN_EXPIRED]: {
    message: '인증이 만료되었습니다',
    userMessage: ERROR_MESSAGES.AUTH.TOKEN_EXPIRED,
    httpStatus: 401,
    logLevel: 'warn',
  },
  [ErrorCode.AUTH_FORBIDDEN]: {
    message: '접근 권한이 없습니다',
    userMessage: ERROR_MESSAGES.AUTH.FORBIDDEN,
    httpStatus: 403,
    logLevel: 'warn',
  },

  // =================
  // 입력값 검증 관련 에러
  // =================
  [ErrorCode.VALIDATION_FAILED]: {
    message: '입력 데이터 검증에 실패했습니다',
    userMessage: ERROR_MESSAGES.VALIDATION.VALIDATION_FAILED,
    httpStatus: 400,
    logLevel: 'info',
  },
  [ErrorCode.VALIDATION_INVALID_INPUT]: {
    message: '입력값이 유효하지 않습니다',
    userMessage: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
    httpStatus: 400,
    logLevel: 'info',
  },
  [ErrorCode.VALIDATION_INVALID_PARAM]: {
    message: '파라미터가 유효하지 않습니다',
    userMessage: ERROR_MESSAGES.VALIDATION.INVALID_PARAM,
    httpStatus: 400,
    logLevel: 'info',
  },

  // =================
  // 리소스 CRUD 관련 에러
  // =================
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    message: '요청한 리소스를 찾을 수 없습니다',
    userMessage: ERROR_MESSAGES.RESOURCE.NOT_FOUND,
    httpStatus: 404,
    logLevel: 'info',
  },
  [ErrorCode.RESOURCE_DUPLICATE]: {
    message: '이미 존재하는 항목입니다',
    userMessage: ERROR_MESSAGES.RESOURCE.DUPLICATE_ENTRY,
    httpStatus: 409,
    logLevel: 'warn',
  },

  // =================
  // 비즈니스 로직 관련 에러
  // =================
  [ErrorCode.BUSINESS_INSUFFICIENT_FUNDS]: {
    message: '잔액이 부족합니다',
    userMessage: ERROR_MESSAGES.BUSINESS.INSUFFICIENT_FUNDS,
    httpStatus: 400,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_PAYMENT_FAILED]: {
    message: '결제에 실패했습니다',
    userMessage: ERROR_MESSAGES.BUSINESS.PAYMENT_FAILED,
    httpStatus: 400,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_ORDER_ALREADY_PROCESSED]: {
    message: '이미 처리된 주문입니다',
    userMessage: ERROR_MESSAGES.BUSINESS.ORDER_ALREADY_PROCESSED,
    httpStatus: 400,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_PRODUCT_OUT_OF_STOCK]: {
    message: '상품이 품절되었습니다',
    userMessage: ERROR_MESSAGES.BUSINESS.PRODUCT_OUT_OF_STOCK,
    httpStatus: 400,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_USER_QUOTA_EXCEEDED]: {
    message: '사용자 할당량을 초과했습니다',
    userMessage: ERROR_MESSAGES.BUSINESS.USER_QUOTA_EXCEEDED,
    httpStatus: 429,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_SUBSCRIPTION_REQUIRED]: {
    message: '구독이 필요한 서비스입니다',
    userMessage: ERROR_MESSAGES.BUSINESS.SUBSCRIPTION_REQUIRED,
    httpStatus: 402,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_INVALID_COUPON]: {
    message: '유효하지 않은 쿠폰입니다',
    userMessage: ERROR_MESSAGES.BUSINESS.INVALID_COUPON,
    httpStatus: 400,
    logLevel: 'warn',
  },
  [ErrorCode.BUSINESS_INVALID_TRANSACTION]: {
    message: '유효하지 않은 거래입니다',
    userMessage: ERROR_MESSAGES.BUSINESS.INVALID_TRANSACTION,
    httpStatus: 400,
    logLevel: 'warn',
  },

  // =================
  // 외부 서비스 연동 관련 에러
  // =================
  [ErrorCode.EXTERNAL_API_ERROR]: {
    message: '외부 서비스 연동 중 오류가 발생했습니다',
    userMessage: ERROR_MESSAGES.SYSTEM.EXTERNAL_API_ERROR,
    httpStatus: 502,
    logLevel: 'error',
  },
  [ErrorCode.EXTERNAL_DATABASE_ERROR]: {
    message: '데이터베이스 오류가 발생했습니다',
    userMessage: ERROR_MESSAGES.SYSTEM.DATABASE_ERROR,
    httpStatus: 500,
    logLevel: 'error',
  },

  // =================
  // 시스템/서버 관련 에러
  // =================
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: {
    message: '서버 오류가 발생했습니다',
    userMessage: ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR,
    httpStatus: 500,
    logLevel: 'error',
  },
  [ErrorCode.SYSTEM_SERVICE_UNAVAILABLE]: {
    message: '서비스를 일시적으로 사용할 수 없습니다',
    userMessage: ERROR_MESSAGES.SYSTEM.SERVICE_UNAVAILABLE,
    httpStatus: 503,
    logLevel: 'error',
  },
};
