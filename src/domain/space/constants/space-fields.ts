/**
 * Space API 응답 필드 정의
 * Repository fields와 Swagger 스키마의 Single Source of Truth
 */

/** 스페이스 목록 조회용 필드 */
export const SPACE_LIST_FIELDS = [
  'id',
  'description',
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
  'resource.owner.isActive'
] as const;

/** 스페이스 상세 조회용 필드 */
export const SPACE_DETAIL_FIELDS = [
  'id',
  'description',
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
  'workspace.name'
] as const;

export type SpaceListField = typeof SPACE_LIST_FIELDS[number];
export type SpaceDetailField = typeof SPACE_DETAIL_FIELDS[number];