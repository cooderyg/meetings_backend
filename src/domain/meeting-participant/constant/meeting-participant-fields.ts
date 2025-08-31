/**
 * MeetingParticipant API 응답 필드 정의
 * Repository fields와 Swagger 스키마의 Single Source of Truth
 */

/** 미팅 참여자 응답 필드 (생성, 조회 시 반환) */
export const MEETING_PARTICIPANT_DETAIL_FIELDS = [
  'id',
  'guestName',
  'createdAt',
  'updatedAt',
  'workspaceMember.id',
  'workspaceMember.firstName',
  'workspaceMember.lastName',
  'workspaceMember.isActive',
  'meeting.id',
  'meeting.status',
  'meeting.resource.id',
  'meeting.resource.title',
] as const;

// 타입 안전성을 위한 유니온 타입 정의
export type MeetingParticipantDetailField =
  (typeof MEETING_PARTICIPANT_DETAIL_FIELDS)[number];
