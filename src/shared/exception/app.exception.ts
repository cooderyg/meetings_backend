import { HttpException } from '@nestjs/common';
import { ErrorCode, ERROR_DEFINITIONS } from '../const/error-code.const';
import { ErrorContextMap } from '../type/error-context.types';

/**
 * 애플리케이션 전용 예외 클래스
 *
 * 자기 설명적 에러 코드와 타입 안전한 컨텍스트 기반의 에러 처리를 제공합니다.
 * 클라이언트에서 i18n을 처리하므로 서버는 코드와 표준화된 컨텍스트만 제공합니다.
 *
 * @example
 * ```typescript
 * // Context가 필요없는 에러
 * throw new AppException('AUTH_UNAUTHORIZED');
 *
 * // Context가 필요한 에러 - 타입 안전성 확보
 * throw new AppException('MEETING_CANNOT_PUBLISH_DRAFT', {
 *   currentStatus: 'DRAFT',
 *   requiredStatus: 'COMPLETED'  // 타입 안전한 context
 * });
 *
 * // 유효성 검증 에러
 * throw new AppException('VALIDATION_FAILED', {
 *   fields: {
 *     email: ['INVALID_FORMAT', 'REQUIRED'],
 *     password: ['TOO_SHORT']
 *   }
 * });
 * ```
 */
export class AppException<T extends keyof ErrorContextMap = keyof ErrorContextMap> extends HttpException {
  /** API 응답에 사용되는 자기 설명적 에러 코드 */
  public readonly code: T;
  
  /** 에러와 관련된 타입 안전한 컨텍스트 정보 */
  public readonly context?: ErrorContextMap[T];
  
  /** 로깅 시 사용할 로그 레벨 */
  public readonly logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';

  /**
   * AppException 생성자
   *
   * @param code - 타입 안전한 에러 코드
   * @param context - 타입 안전한 컨텍스트 정보 (i18n 템플릿 변수용)
   */
  constructor(code: T, context?: ErrorContextMap[T]) {
    const definition = ERROR_DEFINITIONS[code as ErrorCode];
    if (!definition) {
      throw new Error(`Unknown error code: ${code}`);
    }

    // HttpException 부모 클래스 초기화 (에러 코드를 메시지로 사용)
    super(code, definition.httpStatus);

    this.code = code;
    this.context = context;
    this.logLevel = definition.logLevel;
  }

  /**
   * 에러 응답 객체 생성
   */
  toErrorResponse() {
    return {
      code: this.code,
      ...(this.context && { context: this.context }),
    };
  }

  /**
   * 타입 안전한 정적 팩토리 메서드
   */
  static create<T extends keyof ErrorContextMap>(
    code: T,
    ...args: ErrorContextMap[T] extends undefined ? [] : [ErrorContextMap[T]]
  ): AppException<T> {
    return new AppException(code, args[0]);
  }
}