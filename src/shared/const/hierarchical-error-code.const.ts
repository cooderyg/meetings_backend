/**
 * 계층적 에러 코드 정의 (domain.action.reason) - 3계층 통일
 *
 * 3계층 통일 구조의 장점:
 * ✅ 일관성: 모든 에러가 동일한 패턴 (domain.action.reason)
 * ✅ 예측 가능성: 개발자가 구조를 외우지 않아도 됨
 * ✅ 그룹화 용이성: meeting.publish.* 로 발행 관련 모든 에러 검색 가능
 * ✅ 확장성: 새로운 액션/원인을 논리적 위치에 추가 가능
 * ✅ 클라이언트 처리 단순화: 항상 3개 요소로 분리 가능
 *
 * 네이밍 규칙:
 * - domain: 소문자 (meeting, workspace, auth, storage, resource, validation 등)
 * - action: 소문자 camelCase (publish, delete, validate, authorize, fetch 등)
 * - reason: 소문자 camelCase (isDraft, limitExceeded, notFound, failed, denied 등)
 */

// 계층적 에러 코드 타입 정의 (3계층 통일)
export type HierarchicalErrorCode =
  // ===================
  // 인증/권한 도메인 (auth.*.*)
  // ===================
  // 검증 관련 (auth.validate.*)
  | 'auth.validate.failed' // 기존 'auth.unauthorized'
  | 'auth.validate.expired' // 기존 'auth.token.expired'

  // 승인 관련 (auth.authorize.*)
  | 'auth.authorize.denied' // 기존 'auth.forbidden'

  // 접근 관련 (auth.access.*)
  | 'auth.access.denied'

  // 토큰 관련 (auth.token.*)
  | 'auth.token.invalid'
  | 'auth.token.expired'

  // 역할 관련 (auth.role.*)
  | 'auth.role.insufficientPermission'

  // ===================
  // 미팅 도메인
  // ===================
  // 발행 관련
  | 'meeting.publish.isDraft'
  | 'meeting.publish.alreadyPublished'
  | 'meeting.publish.noResources'
  | 'meeting.publish.notAuthorized'
  | 'meeting.publish.notFound'

  // 삭제 관련
  | 'meeting.delete.inProgress'
  | 'meeting.delete.hasPublishedResources'
  | 'meeting.delete.notAuthorized'

  // 편집 관련
  | 'meeting.edit.completed'

  // 접근 관련
  | 'meeting.access.deleted'

  // 권한 관련
  | 'meeting.permission.ownerRequired'

  // 참여자 관련
  | 'meeting.participant.limitExceeded'

  // 상태 관련
  | 'meeting.status.invalidTransition'

  // 녹음 관련
  | 'meeting.record.notFound'

  // 요약 관련
  | 'meeting.summary.generationFailed'

  // 전사 관련
  | 'meeting.transcription.inProgress'
  | 'meeting.transcription.failed'

  // 조회 관련 (meeting.fetch.*)
  | 'meeting.fetch.notFound' // 기존 'meeting.notFound'
  
  // 수정 관련 (meeting.update.*)
  | 'meeting.update.notFound' // 수정하려는 미팅을 찾을 수 없음
  
  // 삭제 관련 (meeting.delete.*)
  | 'meeting.delete.notFound' // 삭제하려는 미팅을 찾을 수 없음

  // ===================
  // 미팅 참여자 도메인 (meetingParticipant.*.*)
  // ===================
  // 생성 관련 (meetingParticipant.create.*)
  | 'meetingParticipant.create.meetingNotFound'
  | 'meetingParticipant.create.memberNotFound'
  | 'meetingParticipant.create.duplicate'

  // 삭제 관련 (meetingParticipant.delete.*)
  | 'meetingParticipant.delete.notFound'

  // ===================
  // 워크스페이스 도메인
  // ===================
  // 접근 관련
  | 'workspace.access.memberRequired'
  | 'workspace.access.denied'

  // 권한 관련
  | 'workspace.permission.ownerRequired'

  // 초대 관련
  | 'workspace.invitation.expired'

  // 멤버 관련
  | 'workspace.member.limitExceeded'
  | 'workspace.member.fetch.notFound' // 워크스페이스 멤버를 찾을 수 없음

  // 조회 관련
  | 'workspace.fetch.notFound' // 워크스페이스를 찾을 수 없음

  // 가입 관련
  | 'workspace.join.alreadyMember'
  | 'workspace.join.limitExceeded'

  // 탈퇴 관련
  | 'workspace.leave.lastOwner'

  // 구독 관련
  | 'workspace.subscription.required'
  | 'workspace.subscription.limitExceeded'

  // ===================
  // 리소스 도메인 (resource.*.*)
  // ===================
  // 조회 관련 (resource.fetch.*)
  | 'resource.fetch.notFound' // 기존 'resource.notFound'
  | 'resource.fetch.duplicate' // 기존 'resource.duplicate'

  // 접근 관련 (resource.access.*)
  | 'resource.access.denied'

  // ===================
  // 검증 도메인 (validation.*.*)
  // ===================
  // 체크 관련 (validation.check.*)
  | 'validation.check.failed' // 기존 'validation.failed'

  // 폼 관련 (validation.form.*)
  | 'validation.form.failed' // 기존 'validation.failed'

  // 입력 관련 (validation.input.*)
  | 'validation.input.invalid'

  // 매개변수 관련 (validation.param.*)
  | 'validation.param.invalid'

  // ===================
  // 스토리지 도메인
  // ===================
  // 업로드 관련
  | 'storage.upload.failed'

  // 다운로드 관련
  | 'storage.download.failed'

  // 삭제 관련
  | 'storage.delete.failed'

  // 파일 관련
  | 'storage.file.notFound'
  | 'storage.file.tooLarge'
  | 'storage.file.invalidFormat'

  // URL 관련
  | 'storage.presignedUrl.failed'

  // 체크 관련
  | 'storage.check.failed'

  // 할당량 관련
  | 'storage.quota.exceeded'

  // ===================
  // STT 도메인
  // ===================
  | 'stt.service.error'
  | 'stt.results.none'
  | 'stt.alternatives.none'

  // ===================
  // 시스템 도메인
  // ===================
  | 'system.internal.error'
  | 'system.service.unavailable'

  // ===================
  // 외부 서비스 도메인
  // ===================
  | 'external.api.error'
  | 'external.database.error'

  // ===================
  // 일반 에러
  // ===================
  | 'general.badRequest'
  | 'general.notFound'
  | 'general.internalError'
  | 'general.serviceUnavailable'

  // ===================
  // 사용자 도메인 (user.*.*)
  // ===================
  // 조회 관련 (user.fetch.*)
  | 'user.fetch.notFound' // 기존 'user.notFound'

  // ===================
  // 스페이스 도메인 (space.*.*)
  // ===================
  // 조회 관련 (space.fetch.*)
  | 'space.fetch.notFound' // 기존 'space.notFound'

  // ===================
  // 역할 도메인 (role.*.*)
  // ===================
  // 시스템 역할 관련 (role.system.*)
  | 'role.system.notFound'

  // ===================
  // LangChain 도메인 (langchain.*.*)
  // ===================
  // 설정 관련 (langchain.config.*)
  | 'langchain.config.missingApiKey'

  // 생성 관련 (langchain.generation.*)
  | 'langchain.generation.failed'

  // 구조화된 출력 관련 (langchain.structuredOutput.*)
  | 'langchain.structuredOutput.failed';

/**
 * 계층적 에러 코드별 HTTP 상태코드 및 로그 레벨 정의
 */
export const HIERARCHICAL_ERROR_DEFINITIONS: Record<
  HierarchicalErrorCode,
  {
    httpStatus: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  }
> = {
  // 인증/권한 (3계층 통일)
  'auth.validate.failed': { httpStatus: 401, logLevel: 'warn' },
  'auth.validate.expired': { httpStatus: 401, logLevel: 'warn' },
  'auth.authorize.denied': { httpStatus: 403, logLevel: 'warn' },
  'auth.access.denied': { httpStatus: 403, logLevel: 'warn' },
  'auth.token.invalid': { httpStatus: 401, logLevel: 'warn' },
  'auth.token.expired': { httpStatus: 401, logLevel: 'warn' },
  'auth.role.insufficientPermission': { httpStatus: 403, logLevel: 'warn' },

  // 미팅 도메인
  'meeting.publish.isDraft': { httpStatus: 400, logLevel: 'warn' },
  'meeting.publish.alreadyPublished': { httpStatus: 400, logLevel: 'warn' },
  'meeting.publish.noResources': { httpStatus: 400, logLevel: 'warn' },
  'meeting.publish.notAuthorized': { httpStatus: 403, logLevel: 'warn' },
  'meeting.publish.notFound': { httpStatus: 404, logLevel: 'info' },
  'meeting.delete.inProgress': { httpStatus: 400, logLevel: 'warn' },
  'meeting.delete.hasPublishedResources': { httpStatus: 400, logLevel: 'warn' },
  'meeting.delete.notAuthorized': { httpStatus: 403, logLevel: 'warn' },
  'meeting.edit.completed': { httpStatus: 400, logLevel: 'warn' },
  'meeting.access.deleted': { httpStatus: 404, logLevel: 'warn' },
  'meeting.permission.ownerRequired': { httpStatus: 403, logLevel: 'warn' },
  'meeting.participant.limitExceeded': { httpStatus: 400, logLevel: 'warn' },
  'meeting.status.invalidTransition': { httpStatus: 400, logLevel: 'warn' },
  'meeting.record.notFound': { httpStatus: 404, logLevel: 'info' },
  'meeting.summary.generationFailed': { httpStatus: 502, logLevel: 'error' },
  'meeting.transcription.inProgress': { httpStatus: 202, logLevel: 'info' },
  'meeting.transcription.failed': { httpStatus: 502, logLevel: 'error' },
  'meeting.fetch.notFound': { httpStatus: 404, logLevel: 'info' },
  'meeting.update.notFound': { httpStatus: 404, logLevel: 'info' },
  'meeting.delete.notFound': { httpStatus: 404, logLevel: 'info' },

  // 미팅 참여자 도메인
  'meetingParticipant.create.meetingNotFound': {
    httpStatus: 404,
    logLevel: 'warn',
  },
  'meetingParticipant.create.memberNotFound': {
    httpStatus: 404,
    logLevel: 'warn',
  },
  'meetingParticipant.create.duplicate': { httpStatus: 409, logLevel: 'warn' },
  'meetingParticipant.delete.notFound': { httpStatus: 404, logLevel: 'warn' },

  // 워크스페이스 도메인
  'workspace.access.memberRequired': { httpStatus: 403, logLevel: 'warn' },
  'workspace.access.denied': { httpStatus: 403, logLevel: 'warn' },
  'workspace.permission.ownerRequired': { httpStatus: 403, logLevel: 'warn' },
  'workspace.invitation.expired': { httpStatus: 400, logLevel: 'info' },
  'workspace.member.limitExceeded': { httpStatus: 429, logLevel: 'warn' },
  'workspace.member.fetch.notFound': { httpStatus: 404, logLevel: 'info' },
  'workspace.fetch.notFound': { httpStatus: 404, logLevel: 'info' },
  'workspace.join.alreadyMember': { httpStatus: 409, logLevel: 'warn' },
  'workspace.join.limitExceeded': { httpStatus: 429, logLevel: 'warn' },
  'workspace.leave.lastOwner': { httpStatus: 400, logLevel: 'warn' },
  'workspace.subscription.required': { httpStatus: 402, logLevel: 'warn' },
  'workspace.subscription.limitExceeded': { httpStatus: 429, logLevel: 'warn' },

  // 공통 리소스 (3계층 통일)
  'resource.fetch.notFound': { httpStatus: 404, logLevel: 'info' },
  'resource.fetch.duplicate': { httpStatus: 409, logLevel: 'warn' },
  'resource.access.denied': { httpStatus: 403, logLevel: 'warn' },

  // 입력값 검증 (3계층 통일)
  'validation.check.failed': { httpStatus: 400, logLevel: 'info' },
  'validation.form.failed': { httpStatus: 400, logLevel: 'info' },
  'validation.input.invalid': { httpStatus: 400, logLevel: 'info' },
  'validation.param.invalid': { httpStatus: 400, logLevel: 'info' },

  // 파일 저장소
  'storage.upload.failed': { httpStatus: 502, logLevel: 'error' },
  'storage.download.failed': { httpStatus: 502, logLevel: 'error' },
  'storage.delete.failed': { httpStatus: 502, logLevel: 'error' },
  'storage.file.notFound': { httpStatus: 404, logLevel: 'warn' },
  'storage.file.tooLarge': { httpStatus: 413, logLevel: 'warn' },
  'storage.file.invalidFormat': { httpStatus: 400, logLevel: 'warn' },
  'storage.presignedUrl.failed': { httpStatus: 502, logLevel: 'error' },
  'storage.check.failed': { httpStatus: 502, logLevel: 'error' },
  'storage.quota.exceeded': { httpStatus: 429, logLevel: 'warn' },

  // 음성 인식
  'stt.service.error': { httpStatus: 502, logLevel: 'error' },
  'stt.results.none': { httpStatus: 400, logLevel: 'warn' },
  'stt.alternatives.none': { httpStatus: 400, logLevel: 'warn' },

  // 시스템/서버
  'system.internal.error': { httpStatus: 500, logLevel: 'error' },
  'system.service.unavailable': { httpStatus: 503, logLevel: 'error' },
  'external.api.error': { httpStatus: 502, logLevel: 'error' },
  'external.database.error': { httpStatus: 500, logLevel: 'error' },

  // 일반 에러
  'general.badRequest': { httpStatus: 400, logLevel: 'warn' },
  'general.notFound': { httpStatus: 404, logLevel: 'info' },
  'general.internalError': { httpStatus: 500, logLevel: 'error' },
  'general.serviceUnavailable': { httpStatus: 503, logLevel: 'error' },

  // 사용자 도메인
  'user.fetch.notFound': { httpStatus: 404, logLevel: 'info' },

  // 스페이스 도메인
  'space.fetch.notFound': { httpStatus: 404, logLevel: 'info' },

  // 역할 도메인
  'role.system.notFound': { httpStatus: 404, logLevel: 'warn' },

  // LangChain 도메인
  'langchain.config.missingApiKey': { httpStatus: 500, logLevel: 'error' },
  'langchain.generation.failed': { httpStatus: 502, logLevel: 'error' },
  'langchain.structuredOutput.failed': { httpStatus: 502, logLevel: 'error' },
};
