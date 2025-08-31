/**
 * Meeting API 응답 필드 정의
 * Repository fields와 Swagger 스키마의 Single Source of Truth
 */

/** 미팅 목록 조회용 필드 (간략 정보) */
export const MEETING_LIST_FIELDS = [
  'id',
  'status',
  'tags',
  'createdAt',
  'updatedAt',
  'resource.id',
  'resource.title',
  'resource.type',
  'resource.visibility',
  'resource.path',
  'resource.owner.id',
  'resource.owner.firstName',
  'resource.owner.lastName',
  'resource.owner.isActive',
] as const;

/** 미팅 상세 조회용 필드 (전체 정보) */
export const MEETING_DETAIL_FIELDS = [
  'id',
  'status',
  'tags',
  'memo',
  'summary',
  'createdAt',
  'updatedAt',
  'resource.id',
  'resource.title',
  'resource.type',
  'resource.visibility',
  'resource.path',
  'resource.owner.id',
  'resource.owner.firstName',
  'resource.owner.lastName',
  'resource.owner.isActive',
  'workspace.id',
  'workspace.name',
] as const;

/** 임시저장 미팅 목록용 필드 */
export const MEETING_DRAFT_FIELDS = [
  'id',
  'status',
  'tags',
  'memo',
  'createdAt',
  'updatedAt',
  'resource.id',
  'resource.title',
  'resource.type',
  'resource.visibility',
  'resource.path',
  'resource.owner.id',
  'resource.owner.firstName',
  'resource.owner.lastName',
  'resource.owner.isActive',
  'workspace.id',
  'workspace.name',
] as const;

/** 미팅 참여자 검증용 필드 (participants 포함) */
export const MEETING_WITH_PARTICIPANTS_FIELDS = [
  ...MEETING_DETAIL_FIELDS,
  'participants.id',
  'participants.workspaceMember.id',
] as const;

// 타입 안전성을 위한 유니온 타입 정의
export type MeetingListField = (typeof MEETING_LIST_FIELDS)[number];
export type MeetingDetailField = (typeof MEETING_DETAIL_FIELDS)[number];
export type MeetingDraftField = (typeof MEETING_DRAFT_FIELDS)[number];
export type MeetingWithParticipantsField =
  (typeof MEETING_WITH_PARTICIPANTS_FIELDS)[number];
