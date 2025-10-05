import {
  HierarchicalErrorCode,
  HIERARCHICAL_ERROR_DEFINITIONS,
} from '../const/hierarchical-error-code.const';

/**
 * 에러 패턴 매칭 및 그룹화 유틸리티
 *
 * domain.action 패턴을 기반으로 계층적 에러 코드를 필터링하고
 * HTTP 상태코드별로 그룹화하여 Swagger 명세에 활용
 */

/**
 * 패턴에 매칭되는 에러 코드들을 찾아 반환
 *
 * @param pattern - 매칭할 패턴 (예: 'meeting.create', 'workspace.member')
 * @returns 매칭되는 에러 코드 배열
 *
 * @example
 * ```typescript
 * getMatchingErrorCodes('meeting.publish')
 * // returns: ['meeting.publish.isDraft', 'meeting.publish.alreadyPublished', ...]
 *
 * getMatchingErrorCodes('meeting')
 * // returns: ['meeting.publish.isDraft', 'meeting.delete.inProgress', ...]
 * ```
 */
export function getMatchingErrorCodes(
  pattern: string
): HierarchicalErrorCode[] {
  const allErrorCodes = Object.keys(
    HIERARCHICAL_ERROR_DEFINITIONS
  ) as HierarchicalErrorCode[];

  return allErrorCodes.filter((code) => {
    // 정확히 pattern으로 시작하는 코드들을 찾음
    if (pattern.endsWith('.')) {
      // 패턴이 '.'으로 끝나면 정확한 prefix 매칭
      return code.startsWith(pattern);
    } else {
      // 패턴이 '.'으로 끝나지 않으면 단어 경계 매칭
      return code.startsWith(pattern + '.') || code === pattern;
    }
  });
}

/**
 * 에러 코드들을 HTTP 상태코드별로 그룹화
 *
 * @param errorCodes - 그룹화할 에러 코드 배열
 * @returns HTTP 상태코드를 키로 하는 에러 코드 그룹
 *
 * @example
 * ```typescript
 * groupErrorCodesByStatus(['meeting.fetch.notFound', 'meeting.publish.isDraft'])
 * // returns: { 404: ['meeting.fetch.notFound'], 400: ['meeting.publish.isDraft'] }
 * ```
 */
export function groupErrorCodesByStatus(
  errorCodes: HierarchicalErrorCode[]
): Record<number, HierarchicalErrorCode[]> {
  const groups: Record<number, HierarchicalErrorCode[]> = {};

  errorCodes.forEach((code) => {
    const definition = HIERARCHICAL_ERROR_DEFINITIONS[code];
    const status = definition.httpStatus;

    if (!groups[status]) {
      groups[status] = [];
    }

    groups[status].push(code);
  });

  return groups;
}

/**
 * HTTP 상태코드에 대한 설명 반환
 *
 * @param status - HTTP 상태코드
 * @returns 상태코드에 대한 한국어 설명
 */
export function getStatusDescription(status: number): string {
  const statusDescriptions: Record<number, string> = {
    400: '잘못된 요청',
    401: '인증 실패',
    403: '권한 거부',
    404: '리소스 없음',
    409: '데이터 충돌',
    413: '요청 크기 초과',
    422: '처리 불가능한 엔티티',
    429: '요청 한도 초과',
    500: '서버 내부 오류',
    502: '외부 서비스 오류',
    503: '서비스 일시 중단',
  };

  return statusDescriptions[status] || `HTTP ${status} 오류`;
}

/**
 * 에러 코드에서 예시 컨텍스트 생성
 *
 * @param errorCode - 에러 코드
 * @returns 해당 에러 코드의 예시 컨텍스트 객체
 */
export function generateErrorCodeExample(
  errorCode: HierarchicalErrorCode
): Record<string, any> {
  // 에러 코드 패턴별 예시 컨텍스트 생성 로직
  const examples: Record<string, Record<string, any>> = {
    'meeting.fetch.notFound': { meetingId: 'mtg_123' },
    'meeting.update.notFound': { meetingId: 'mtg_123' },
    'meeting.delete.notFound': { meetingId: 'mtg_123' },
    'meeting.publish.notFound': { meetingId: 'mtg_123' },
    'meeting.publish.isDraft': {
      currentStatus: 'DRAFT',
      requiredStatus: 'COMPLETED',
    },
    'workspace.fetch.notFound': { workspaceId: 'ws_123' },
    'workspace.member.fetch.notFound': {
      workspaceId: 'ws_123',
      memberId: 'member_123',
    },
    'meetingParticipant.create.meetingNotFound': { meetingId: 'mtg_123' },
    'meetingParticipant.create.memberNotFound': {
      workspaceMemberId: 'wm_123',
    },
  };

  // 정확한 매칭 우선, 없으면 패턴 매칭
  if (examples[errorCode]) {
    return examples[errorCode];
  }

  // 패턴 기반 기본 컨텍스트 생성
  const segments = errorCode.split('.');
  const domain = segments[0];

  switch (domain) {
    case 'meeting':
      return { meetingId: 'mtg_123' };
    case 'workspace':
      return { workspaceId: 'ws_123' };
    case 'meetingParticipant':
      return { meetingId: 'mtg_123', workspaceMemberId: 'wm_123' };
    default:
      return {};
  }
}
