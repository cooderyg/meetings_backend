import { ErrorCode } from '../enum/error-code';

/**
 * 에러 코드 런타임 검증을 위한 데코레이터와 유틸리티
 */

/**
 * 에러 코드가 유효한지 검증하는 함수
 * @param code 검증할 에러 코드
 * @returns 유효한 에러 코드인지 여부
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return Object.values(ErrorCode).includes(code as ErrorCode);
}

/**
 * 에러 코드 패턴이 올바른지 검증하는 함수
 * @param code 검증할 에러 코드
 * @returns 올바른 패턴인지 여부
 */
export function validateErrorCodePattern(code: string): boolean {
  // 에러 코드 패턴: [PREFIX]_[NUMBER]
  const pattern = /^(AUTH|VAL|RES|BIZ|EXT|SYS)_\d{3}$/;
  return pattern.test(code);
}

/**
 * 에러 코드 사용을 추적하는 메서드 데코레이터
 * 개발 환경에서 잘못된 에러 코드 사용을 감지
 */
export function ValidateErrorCode(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    // 개발 환경에서만 검증
    if (process.env.NODE_ENV === 'development') {
      // 첫 번째 인수가 에러 코드인지 확인
      if (args.length > 0 && typeof args[0] === 'string') {
        const errorCode = args[0];

        if (!isValidErrorCode(errorCode)) {
          console.warn(
            `[ErrorCode Validator] Invalid error code detected: ${errorCode}\n` +
              `Method: ${target.constructor.name}.${propertyKey}\n` +
              `Valid codes: ${Object.values(ErrorCode).join(', ')}`,
          );
        }

        if (!validateErrorCodePattern(errorCode)) {
          console.warn(
            `[ErrorCode Validator] Invalid error code pattern: ${errorCode}\n` +
              `Expected pattern: [PREFIX]_[NUMBER] (e.g., AUTH_001)\n` +
              `Method: ${target.constructor.name}.${propertyKey}`,
          );
        }
      }
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * 에러 코드 통계를 위한 추적 데코레이터
 */
export function TrackErrorCode(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    // 에러 코드 사용 통계 (개발/운영 환경 모두)
    if (args.length > 0 && typeof args[0] === 'string') {
      const errorCode = args[0];

      // 글로벌 에러 통계 객체에 기록
      if (!global.errorCodeStats) {
        global.errorCodeStats = {};
      }

      if (!global.errorCodeStats[errorCode]) {
        global.errorCodeStats[errorCode] = 0;
      }

      global.errorCodeStats[errorCode]++;
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * 에러 코드 사용 통계를 반환하는 함수
 */
export function getErrorCodeStats(): Record<string, number> {
  return global.errorCodeStats || {};
}

/**
 * 에러 코드 사용 통계를 초기화하는 함수
 */
export function resetErrorCodeStats(): void {
  global.errorCodeStats = {};
}
