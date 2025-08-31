import { EntityMetadata } from '../types/metadata.types';
import {
  createUuidField,
  createEnumField,
  createStringField,
  createDateTimeField,
  createObjectField,
  createNumberField,
  createBooleanField,
} from '../schema/field-mapper';
import {
  Action,
  ResourceSubject,
} from '../../../domain/permission/entity/permission.entity';
import { SystemRole } from '../../../domain/role/enum/system-role.enum';

export const PERMISSION_METADATA: EntityMetadata = {
  id: createNumberField('권한 고유 식별자', 1),
  action: createEnumField(Action, '액션 타입', Action.READ),
  resourceSubject: createEnumField(
    ResourceSubject,
    '리소스 주체',
    ResourceSubject.MEETING
  ),
};

export const ROLE_METADATA: EntityMetadata = {
  id: createNumberField('역할 고유 식별자', 1),
  name: createStringField('역할 이름', '관리자'),
  description: createStringField('역할 설명', '워크스페이스 관리 권한', true),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

export const ROLE_PERMISSION_METADATA: EntityMetadata = {
  conditions: createObjectField('권한 조건', { resource: 'specific-id' }, true),
};

export const MEMBER_RESOURCE_PERMISSION_METADATA: EntityMetadata = {
  id: createUuidField('멤버 리소스 권한 고유 식별자'),
  resourcePath: createStringField(
    'LTree 계층 경로',
    'e720eee0-2997-4d27-af68-d5de5b84f911.1756546110974'
  ),
  isAllowed: createBooleanField('권한 허용 여부', true),
  expiresAt: createDateTimeField('권한 만료일시', true),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

export const WORKSPACE_MEMBER_ROLE_METADATA: EntityMetadata = {
  id: createUuidField('워크스페이스 멤버 역할 고유 식별자'),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

// Enum 참조용 메타데이터
export const SYSTEM_ROLE_METADATA: EntityMetadata = {
  role: createEnumField(SystemRole, '시스템 역할', SystemRole.ADMIN),
};
