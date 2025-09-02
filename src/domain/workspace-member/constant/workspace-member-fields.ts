/**
 * 워크스페이스 멤버 응답 필드 정의
 *
 * API 응답에 포함될 필드를 미리 정의하여 일관성 있는 데이터 구조를 제공합니다.
 * 각 필드 상수는 특정 사용 사례에 최적화되어 있습니다.
 */

/**
 * 워크스페이스 멤버 목록 조회용 필드
 *
 * 목록 화면에서 필요한 최소한의 정보만 포함
 * - 기본 정보: id, 이름, 활성화 상태
 * - 사용자 정보: id, 이메일
 * - 역할 정보: 멤버의 역할과 시스템 역할
 */
export const WORKSPACE_MEMBER_LIST_FIELDS = [
  'id',
  'isActive',
  'firstName',
  'lastName',
  'imagePath',
  'createdAt',
  // User 관계 필드 (중요: 올바른 경로 지정)
  'user.id',
  'user.email',
  // WorkspaceMemberRoles 관계 필드
  'workspaceMemberRoles.id',
  'workspaceMemberRoles.role.id',
  'workspaceMemberRoles.role.name',
] as const;

/**
 * 워크스페이스 멤버 상세 조회용 필드
 *
 * 상세 화면에서 필요한 모든 정보 포함
 * - 목록 필드 전체
 * - 추가 정보: 업데이트 시간, 워크스페이스 정보
 */
export const WORKSPACE_MEMBER_DETAIL_FIELDS = [
  ...WORKSPACE_MEMBER_LIST_FIELDS,
  'updatedAt',
  'workspace.id',
  'workspace.name',
] as const;

/**
 * 워크스페이스 멤버 간단 조회용 필드
 *
 * 다른 엔티티에서 참조할 때 사용하는 최소 필드
 * - 식별 정보와 표시용 이름만 포함
 */
export const WORKSPACE_MEMBER_SIMPLE_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'user.id',
  'user.email',
] as const;

// Populate 설정 상수들

/**
 * 워크스페이스 멤버 목록 조회용 Populate
 *
 * 목록에서 필요한 관계 데이터만 선별적으로 populate
 * - user: 사용자 기본 정보만 (id, email만 필요)
 * - workspaceMemberRoles.role: 역할 정보만
 * - workspace는 제외 (불필요한 정보)
 */
export const WORKSPACE_MEMBER_LIST_POPULATE = [
  'workspaceMemberRoles',
  'workspaceMemberRoles.role',
  'user',
] as const;

/**
 * 워크스페이스 멤버 상세 조회용 Populate
 *
 * 상세 화면에서 필요한 모든 관계 데이터
 * - 목록 populate 전체
 * - workspace: 워크스페이스 정보
 */
export const WORKSPACE_MEMBER_DETAIL_POPULATE = [
  'user',
  'workspace',
  'workspaceMemberRoles',
  'workspaceMemberRoles.role',
] as const;

/**
 * 워크스페이스 멤버 간단 조회용 Populate
 *
 * 최소한의 관계 데이터만 포함
 */
export const WORKSPACE_MEMBER_SIMPLE_POPULATE = ['user'] as const;
