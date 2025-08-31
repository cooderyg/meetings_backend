// types/hierarchical-error-context.types 내용을 복사
export interface HierarchicalErrorContextMap {
  // ===================
  // 인증/권한 도메인 (auth.*.*)
  // ===================
  // 검증 관련 (auth.validate.*)
  'auth.validate.failed': undefined;
  'auth.validate.expired': undefined;
  
  // 승인 관련 (auth.authorize.*)
  'auth.authorize.denied': undefined;

  // ===================
  // 미팅 도메인 (meeting.*.*)
  // ===================
  'meeting.publish.isDraft': {
    currentStatus: string;
    requiredStatus: string;
  };
  'meeting.publish.noResources': undefined;
  'meeting.publish.notAuthorized': {
    userId: string;
    meetingId: string;
  };
  'meeting.publish.alreadyPublished': undefined;
  'meeting.delete.hasPublishedResources': {
    resourceCount: number;
  };
  'meeting.delete.notAuthorized': {
    userId: string;
    meetingId: string;
  };
  'meeting.delete.inProgress': undefined;
  'meeting.edit.completed': undefined;
  'meeting.access.deleted': undefined;
  'meeting.permission.ownerRequired': undefined;
  'meeting.participant.limitExceeded': undefined;
  'meeting.status.invalidTransition': undefined;
  'meeting.record.notFound': undefined;
  'meeting.summary.generationFailed': undefined;
  'meeting.transcription.inProgress': undefined;
  'meeting.transcription.failed': undefined;
  'meeting.fetch.notFound': {
    meetingId: string;
  };

  // ===================
  // 미팅 참여자 도메인 (meetingParticipant.*.*)
  // ===================
  'meetingParticipant.create.meetingNotFound': undefined;
  'meetingParticipant.create.memberNotFound': undefined;
  'meetingParticipant.create.alreadyParticipating': undefined;
  'meetingParticipant.delete.notFound': undefined;

  // ===================
  // 워크스페이스 도메인 (workspace.*.*)
  // ===================
  'workspace.join.alreadyMember': {
    userId: string;
    workspaceId: string;
  };
  'workspace.join.limitExceeded': {
    currentCount: number;
    maxCount: number;
  };
  'workspace.leave.lastOwner': undefined;
  'workspace.fetch.notFound': {
    workspaceId: string;
  };
  'workspace.subscription.required': {
    requiredPlan: string;
  };
  'workspace.subscription.limitExceeded': {
    resource: string;
    currentCount: number;
    maxCount: number;
  };
  'workspace.access.memberRequired': undefined;
  'workspace.access.denied': undefined;
  'workspace.permission.ownerRequired': undefined;
  'workspace.invitation.expired': undefined;
  'workspace.member.limitExceeded': undefined;
  'workspace.member.fetch.notFound': undefined;

  // ===================
  // 리소스 도메인 (resource.*.*)
  // ===================
  // 조회 관련 (resource.fetch.*)
  'resource.fetch.notFound': {
    resourceId?: string;
    resourceType?: string;
  };
  'resource.fetch.duplicate': undefined;
  
  // 접근 관련 (resource.access.*)
  'resource.access.denied': undefined;
  
  // ===================
  // 검증 도메인 (validation.*.*)
  // ===================
  // 체크 관련 (validation.check.*)
  'validation.check.failed': {
    fields?: Record<string, string[]>;
    reason?: string;
  };
  
  // 입력 관련 (validation.input.*)
  'validation.input.invalid': undefined;
  
  // 매개변수 관련 (validation.param.*)
  'validation.param.invalid': undefined;

  // ===================
  // 스토리지 도메인 (storage.*.*)
  // ===================
  'storage.file.tooLarge': {
    maxSize: number;
    actualSize: number;
  };
  'storage.file.invalidFormat': {
    allowedFormats: string[];
    actualFormat: string;
  };
  'storage.file.notFound': {
    fileName: string;
  };
  'storage.quota.exceeded': {
    currentUsage: number;
    quota: number;
  };
  'storage.upload.failed': {
    maxFileSize?: string;
    allowedFormats?: string[];
    reason?: string;
  };
  'storage.download.failed': undefined;
  'storage.delete.failed': undefined;
  'storage.presignedUrl.failed': undefined;
  'storage.check.failed': undefined;

  // ===================
  // STT 도메인 (stt.*.*)
  // ===================
  'stt.service.error': undefined;
  'stt.results.none': undefined;
  'stt.alternatives.none': undefined;
  
  // ===================
  // 시스템 도메인 (system.*.*)
  // ===================
  'system.internal.error': undefined;
  'system.service.unavailable': undefined;
  
  // ===================
  // 외부 서비스 도메인 (external.*.*)
  // ===================
  'external.api.error': undefined;
  'external.database.error': undefined;
  
  // ===================
  // 일반 에러 (general.*.*)
  // ===================
  'general.badRequest': undefined;
  'general.notFound': undefined;
  'general.internalError': undefined;
  'general.serviceUnavailable': undefined;
  
  // ===================
  // 사용자 도메인 (user.*.*)
  // ===================
  'user.fetch.notFound': undefined;
  
  // ===================
  // 스페이스 도메인 (space.*.*)
  // ===================
  'space.fetch.notFound': undefined;
  
  // ===================
  // 역할 도메인 (role.*.*)
  // ===================
  'role.system.notFound': undefined;
  
  // ===================
  // LangChain 도메인 (langchain.*.*)
  // ===================
  'langchain.config.missingApiKey': undefined;
  'langchain.generation.failed': undefined;
  'langchain.structuredOutput.failed': undefined;
  
  // ===================
  // 레거시 에러 코드 (점진적 마이그레이션) - 3계층으로 변경
  // ===================
  'auth.access.denied': undefined;
  'auth.token.invalid': undefined;
  'auth.token.expired': undefined;
  'auth.role.insufficientPermission': {
    requiredRole: string;
    currentRole: string;
  };
  'validation.form.failed': {
    fields: Record<string, string[]>;
  };
}