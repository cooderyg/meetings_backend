import { HttpException } from '@nestjs/common';
import {
  HierarchicalErrorCode,
  HIERARCHICAL_ERROR_DEFINITIONS,
} from '../const/hierarchical-error-code.const';
import { HierarchicalErrorContextMap } from '../type/hierarchical-error-context.types';

/**
 * 계층적 에러 코드 기반 애플리케이션 예외 클래스
 *
 * 자기 설명적 계층적 에러 코드(domain.action.reason)와 타입 안전한 컨텍스트 기반의 에러 처리를 제공합니다.
 * 클라이언트에서 i18n을 처리하므로 서버는 코드와 표준화된 컨텍스트만 제공합니다.
 *
 * 계층적 구조의 장점:
 * ✅ 그룹화 가능: meeting.publish.* 로 발행 관련 모든 에러를 검색
 * ✅ 확장성: 새로운 액션/원인을 논리적 위치에 추가
 * ✅ 가독성: domain.action.reason 구조로 명확한 의미 전달
 * ✅ 관리성: 관련 에러들을 논리적으로 그룹화
 *
 * @example
 * ```typescript
 * // Context가 필요없는 에러
 * throw new HierarchicalAppException('auth.unauthorized');
 *
 * // Context가 필요한 에러 - 타입 안전성 확보
 * throw new HierarchicalAppException('meeting.publish.isDraft', {
 *   currentStatus: 'DRAFT',
 *   requiredStatus: 'COMPLETED'  // 타입 안전한 context
 * });
 *
 * // 그룹별 에러 처리 가능
 * if (error.code.startsWith('meeting.publish.')) {
 *   // 모든 미팅 발행 관련 에러 처리
 * }
 * ```
 */
export class HierarchicalAppException<
  T extends
    keyof HierarchicalErrorContextMap = keyof HierarchicalErrorContextMap,
> extends HttpException {
  /** API 응답에 사용되는 계층적 에러 코드 (domain.action.reason) */
  public readonly code: T;

  /** 에러와 관련된 타입 안전한 컨텍스트 정보 */
  public readonly context?: HierarchicalErrorContextMap[T];

  /** 로깅 시 사용할 로그 레벨 */
  public readonly logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';

  /** 도메인 정보 (첫 번째 세그먼트) */
  public readonly domain: string;

  /** 액션 정보 (두 번째 세그먼트, 있는 경우) */
  public readonly action?: string;

  /** 원인 정보 (세 번째 세그먼트, 있는 경우) */
  public readonly reason?: string;

  /**
   * HierarchicalAppException 생성자
   *
   * @param code - 타입 안전한 계층적 에러 코드
   * @param context - 타입 안전한 컨텍스트 정보 (i18n 템플릿 변수용)
   */
  constructor(code: T, context?: HierarchicalErrorContextMap[T]) {
    const definition =
      HIERARCHICAL_ERROR_DEFINITIONS[code as HierarchicalErrorCode];
    if (!definition) {
      throw new Error(`Unknown hierarchical error code: ${code}`);
    }

    // HttpException 부모 클래스 초기화 (에러 코드를 메시지로 사용)
    super(code, definition.httpStatus);

    this.code = code;
    this.context = context;
    this.logLevel = definition.logLevel;

    // 계층적 구조 파싱
    const segments = (code as string).split('.');
    this.domain = segments[0];
    this.action = segments[1];
    this.reason = segments[2];
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
   * 도메인별 에러 검사
   */
  isMeetingError(): boolean {
    return this.domain === 'meeting';
  }

  isWorkspaceError(): boolean {
    return this.domain === 'workspace';
  }

  isAuthError(): boolean {
    return this.domain === 'auth';
  }

  isStorageError(): boolean {
    return this.domain === 'storage';
  }

  /**
   * 액션별 에러 검사 (미팅 도메인 예시)
   */
  isMeetingPublishError(): boolean {
    return this.domain === 'meeting' && this.action === 'publish';
  }

  isMeetingDeleteError(): boolean {
    return this.domain === 'meeting' && this.action === 'delete';
  }

  /**
   * 특정 그룹에 속하는지 확인
   */
  isInGroup(prefix: string): boolean {
    return (this.code as string).startsWith(prefix);
  }

  /**
   * 타입 안전한 정적 팩토리 메서드
   */
  static create<T extends keyof HierarchicalErrorContextMap>(
    code: T,
    ...args: HierarchicalErrorContextMap[T] extends undefined
      ? []
      : [HierarchicalErrorContextMap[T]]
  ): HierarchicalAppException<T> {
    return new HierarchicalAppException(code, args[0]);
  }

  /**
   * 그룹별 생성 헬퍼 메서드들
   */
  static createMeetingError<T extends HierarchicalErrorCode>(
    code: T extends `meeting.${string}` ? T : never,
    ...args: HierarchicalErrorContextMap[T] extends undefined
      ? []
      : [HierarchicalErrorContextMap[T]]
  ) {
    return new HierarchicalAppException(code, args[0]);
  }

  static createWorkspaceError<T extends HierarchicalErrorCode>(
    code: T extends `workspace.${string}` ? T : never,
    ...args: HierarchicalErrorContextMap[T] extends undefined
      ? []
      : [HierarchicalErrorContextMap[T]]
  ) {
    return new HierarchicalAppException(code, args[0]);
  }

  static createAuthError<T extends HierarchicalErrorCode>(
    code: T extends `auth.${string}` ? T : never,
    ...args: HierarchicalErrorContextMap[T] extends undefined
      ? []
      : [HierarchicalErrorContextMap[T]]
  ) {
    return new HierarchicalAppException(code, args[0]);
  }

  static createStorageError<T extends HierarchicalErrorCode>(
    code: T extends `storage.${string}` ? T : never,
    ...args: HierarchicalErrorContextMap[T] extends undefined
      ? []
      : [HierarchicalErrorContextMap[T]]
  ) {
    return new HierarchicalAppException(code, args[0]);
  }
}
