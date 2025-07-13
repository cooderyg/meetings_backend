import { ErrorCode } from '../enum/error-code';
import { ERROR_DEFINITIONS } from '../const/err-def.const';

/**
 * 에러 응답 성능 최적화를 위한 캐시 유틸리티
 *
 * 자주 사용되는 에러 메시지와 응답 객체를 캐시하여
 * 에러 응답 생성 시간을 단축합니다.
 */
class ErrorCacheManager {
  private static instance: ErrorCacheManager;
  private errorResponseCache: Map<string, any> = new Map();
  private errorMessageCache: Map<ErrorCode, string> = new Map();
  private readonly maxCacheSize = 100;

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ErrorCacheManager {
    if (!ErrorCacheManager.instance) {
      ErrorCacheManager.instance = new ErrorCacheManager();
    }
    return ErrorCacheManager.instance;
  }

  /**
   * 에러 메시지 캐시 조회
   * @param errorCode 에러 코드
   * @returns 캐시된 에러 메시지 또는 undefined
   */
  getCachedErrorMessage(errorCode: ErrorCode): string | undefined {
    return this.errorMessageCache.get(errorCode);
  }

  /**
   * 에러 메시지 캐시 저장
   * @param errorCode 에러 코드
   * @param message 에러 메시지
   */
  setCachedErrorMessage(errorCode: ErrorCode, message: string): void {
    if (this.errorMessageCache.size >= this.maxCacheSize) {
      // LRU 방식으로 가장 오래된 항목 제거
      const firstKey = this.errorMessageCache.keys().next().value;
      this.errorMessageCache.delete(firstKey);
    }
    this.errorMessageCache.set(errorCode, message);
  }

  /**
   * 에러 응답 객체 캐시 조회
   * @param cacheKey 캐시 키
   * @returns 캐시된 응답 객체 또는 undefined
   */
  getCachedErrorResponse(cacheKey: string): any {
    return this.errorResponseCache.get(cacheKey);
  }

  /**
   * 에러 응답 객체 캐시 저장
   * @param cacheKey 캐시 키
   * @param response 에러 응답 객체
   */
  setCachedErrorResponse(cacheKey: string, response: any): void {
    if (this.errorResponseCache.size >= this.maxCacheSize) {
      // LRU 방식으로 가장 오래된 항목 제거
      const firstKey = this.errorResponseCache.keys().next().value;
      this.errorResponseCache.delete(firstKey);
    }
    this.errorResponseCache.set(cacheKey, response);
  }

  /**
   * 에러 응답 캐시 키 생성
   * @param errorCode 에러 코드
   * @param isDevelopment 개발 환경 여부
   * @param customMessage 커스텀 메시지
   * @returns 캐시 키
   */
  generateCacheKey(
    errorCode: ErrorCode,
    isDevelopment: boolean,
    customMessage?: string,
  ): string {
    return `${errorCode}:${isDevelopment}:${customMessage || 'default'}`;
  }

  /**
   * 캐시 통계 조회
   * @returns 캐시 통계 정보
   */
  getCacheStats(): CacheStats {
    return {
      messageCache: {
        size: this.errorMessageCache.size,
        maxSize: this.maxCacheSize,
        usage: (this.errorMessageCache.size / this.maxCacheSize) * 100,
      },
      responseCache: {
        size: this.errorResponseCache.size,
        maxSize: this.maxCacheSize,
        usage: (this.errorResponseCache.size / this.maxCacheSize) * 100,
      },
    };
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.errorMessageCache.clear();
    this.errorResponseCache.clear();
  }

  /**
   * 자주 사용되는 에러 메시지 프리로드
   */
  preloadCommonErrors(): void {
    // 자주 사용되는 에러 코드들을 미리 캐시
    const commonErrors = [
      ErrorCode.AUTH_UNAUTHORIZED,
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.RESOURCE_NOT_FOUND,
      ErrorCode.SYSTEM_INTERNAL_ERROR,
    ];

    for (const errorCode of commonErrors) {
      const errorDef = ERROR_DEFINITIONS[errorCode];
      if (errorDef) {
        this.setCachedErrorMessage(errorCode, errorDef.userMessage);
      }
    }
  }
}

/**
 * 에러 캐시 유틸리티 함수들
 */
export class ErrorCacheUtil {
  private static cacheManager = ErrorCacheManager.getInstance();

  /**
   * 최적화된 에러 메시지 조회
   * @param errorCode 에러 코드
   * @returns 에러 메시지
   */
  static getOptimizedErrorMessage(errorCode: ErrorCode): string {
    // 캐시에서 먼저 조회
    let message = this.cacheManager.getCachedErrorMessage(errorCode);

    if (!message) {
      // 캐시에 없으면 ERROR_DEFINITIONS에서 조회하여 캐시에 저장
      const errorDef = ERROR_DEFINITIONS[errorCode];
      message = errorDef
        ? errorDef.userMessage
        : '알 수 없는 오류가 발생했습니다';
      this.cacheManager.setCachedErrorMessage(errorCode, message);
    }

    return message;
  }

  /**
   * 최적화된 에러 응답 객체 생성
   * @param errorCode 에러 코드
   * @param isDevelopment 개발 환경 여부
   * @param customMessage 커스텀 메시지 (선택사항)
   * @param details 상세 정보 (선택사항)
   * @returns 에러 응답 객체
   */
  static createOptimizedErrorResponse(
    errorCode: ErrorCode,
    isDevelopment: boolean,
    customMessage?: string,
    details?: any,
  ): any {
    // details가 있으면 캐시 사용 안함 (동적 데이터)
    if (details) {
      return this.createFreshErrorResponse(
        errorCode,
        isDevelopment,
        customMessage,
        details,
      );
    }

    const cacheKey = this.cacheManager.generateCacheKey(
      errorCode,
      isDevelopment,
      customMessage,
    );

    // 캐시에서 먼저 조회
    let response = this.cacheManager.getCachedErrorResponse(cacheKey);

    if (!response) {
      // 캐시에 없으면 새로 생성하여 캐시에 저장
      response = this.createFreshErrorResponse(
        errorCode,
        isDevelopment,
        customMessage,
      );
      this.cacheManager.setCachedErrorResponse(cacheKey, response);
    }

    return response;
  }

  /**
   * 새로운 에러 응답 객체 생성 (캐시 없음)
   * @param errorCode 에러 코드
   * @param isDevelopment 개발 환경 여부
   * @param customMessage 커스텀 메시지
   * @param details 상세 정보
   * @returns 새로운 에러 응답 객체
   */
  private static createFreshErrorResponse(
    errorCode: ErrorCode,
    isDevelopment: boolean,
    customMessage?: string,
    details?: any,
  ): any {
    const errorDef = ERROR_DEFINITIONS[errorCode];
    const message =
      customMessage || errorDef?.message || '알 수 없는 오류가 발생했습니다';
    const userMessage = errorDef?.userMessage || '일시적인 오류가 발생했습니다';

    const response: any = {
      code: errorCode,
      message,
      userMessage,
    };

    if (details) {
      response.details = details;
    }

    if (isDevelopment) {
      response.debug = {
        errorCode,
        timestamp: new Date().toISOString(),
      };
    }

    return response;
  }

  /**
   * 캐시 통계 조회
   * @returns 캐시 통계 정보
   */
  static getCacheStats(): CacheStats {
    return this.cacheManager.getCacheStats();
  }

  /**
   * 캐시 초기화
   */
  static clearCache(): void {
    this.cacheManager.clearCache();
  }

  /**
   * 자주 사용되는 에러 프리로드
   */
  static preloadCommonErrors(): void {
    this.cacheManager.preloadCommonErrors();
  }
}

/**
 * 캐시 통계 인터페이스
 */
interface CacheStats {
  messageCache: {
    size: number;
    maxSize: number;
    usage: number;
  };
  responseCache: {
    size: number;
    maxSize: number;
    usage: number;
  };
}

// 애플리케이션 시작 시 공통 에러 프리로드
if (process.env.NODE_ENV === 'production') {
  ErrorCacheUtil.preloadCommonErrors();
}
