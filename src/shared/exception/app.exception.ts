import { HttpException } from '@nestjs/common';
import { ErrorCodeDefinition } from '../const/error-code.const';

/**
 * 애플리케이션 예외 생성 시 사용할 옵션 인터페이스
 */
export interface AppExceptionOptions {
  /** 커스텀 메시지 (미제공 시 ERROR_DEFINITIONS의 기본 메시지 사용) */
  message?: string;
  /** 추가 상세 정보 (API 응답에 포함됨) */
  details?: any;
  /** 메타데이터 (현재 사용되지 않음, 향후 확장용) */
  meta?: Record<string, any>;
}

/**
 * 애플리케이션 전용 예외 클래스
 *
 * ERROR_CODES 객체를 기반으로 표준화된 에러 응답을 생성합니다.
 * 각 에러 코드별로 미리 정의된 HTTP 상태 코드, 메시지, 로그 레벨을 사용합니다.
 *
 * @example
 * ```typescript
 * // 기본 사용법
 * throw new AppException(ERROR_CODES.AUTH_UNAUTHORIZED);
 *
 * // 커스텀 메시지와 상세 정보 포함
 * throw new AppException(ERROR_CODES.VALIDATION_FAILED, {
 *   message: '사용자 입력값 검증 실패',
 *   details: { field: 'email', reason: 'invalid format' }
 * });
 * ```
 */
export class AppException extends HttpException {
  /** API 응답에 사용되는 에러 코드 (예: 'AUTH_001') */
  readonly code: string;
  /** 내부적으로 사용되는 에러 정의 객체 */
  readonly errorDef: ErrorCodeDefinition;
  /** 에러 관련 추가 상세 정보 */
  readonly details?: any;
  /** 로깅 시 사용할 로그 레벨 */
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';

  /**
   * AppException 생성자
   *
   * @param errorDef - 에러 정의 객체 (ERROR_CODES의 값)
   * @param options - 추가 옵션 (메시지, 상세정보 등)
   */
  constructor(errorDef: ErrorCodeDefinition, options?: AppExceptionOptions) {
    // 커스텀 메시지가 있으면 사용, 없으면 기본 메시지 사용
    const message = options?.message || errorDef.message;

    // HttpException 부모 클래스 초기화
    super(message, errorDef.httpStatus);

    // 각 속성 초기화
    this.errorDef = errorDef;
    this.code = errorDef.code;
    this.logLevel = errorDef.logLevel;
    this.details = options?.details;
  }
}
