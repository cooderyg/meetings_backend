import { fieldsToNestedObject } from '../../util/field.util';
import {
  EntityFieldInfo,
  MetadataCollection,
  ValidationResult,
} from '../types/metadata.types';

// 모든 메타데이터를 중앙에서 관리
import {
  MEETING_METADATA,
  MEETING_PARTICIPANT_METADATA,
  MEETING_RECORD_METADATA,
} from '../metadata/meeting.metadata';
import { SPACE_METADATA, RESOURCE_METADATA } from '../metadata/space.metadata';
import {
  USER_METADATA,
  WORKSPACE_MEMBER_METADATA,
} from '../metadata/user.metadata';
import { WORKSPACE_METADATA } from '../metadata/workspace.metadata';
import { LOGIN_EVENT_METADATA } from '../metadata/auth.metadata';
import {
  PERMISSION_METADATA,
  ROLE_METADATA,
  ROLE_PERMISSION_METADATA,
  MEMBER_RESOURCE_PERMISSION_METADATA,
  WORKSPACE_MEMBER_ROLE_METADATA,
  SYSTEM_ROLE_METADATA,
} from '../metadata/permission.metadata';

/**
 * 전체 메타데이터 컬렉션
 */
export const FIELD_METADATA: MetadataCollection = {
  Meeting: MEETING_METADATA,
  MeetingParticipant: MEETING_PARTICIPANT_METADATA,
  MeetingRecord: MEETING_RECORD_METADATA,
  Space: SPACE_METADATA,
  Resource: RESOURCE_METADATA,
  User: USER_METADATA,
  WorkspaceMember: WORKSPACE_MEMBER_METADATA,
  Workspace: WORKSPACE_METADATA,
  LoginEvent: LOGIN_EVENT_METADATA,
  Permission: PERMISSION_METADATA,
  Role: ROLE_METADATA,
  RolePermission: ROLE_PERMISSION_METADATA,
  MemberResourcePermission: MEMBER_RESOURCE_PERMISSION_METADATA,
  WorkspaceMemberRole: WORKSPACE_MEMBER_ROLE_METADATA,
  SystemRole: SYSTEM_ROLE_METADATA,
};

/**
 * 엔티티 이름 매핑
 */
const ENTITY_NAME_MAPPING: Record<string, string> = {
  resource: 'Resource',
  workspace: 'Workspace',
  owner: 'WorkspaceMember',
  meeting: 'Meeting',
  space: 'Space',
  workspaceMember: 'WorkspaceMember',
  participants: 'MeetingParticipant',
  user: 'User',
  role: 'Role',
  permission: 'Permission',
  rolePermissions: 'RolePermission',
  memberResourcePermissions: 'MemberResourcePermission',
  loginEvents: 'LoginEvent',
  workspaceMemberRoles: 'WorkspaceMemberRole',
};

/**
 * 키 이름을 기반으로 Entity 이름 추론
 */
function getNestedEntityName(key: string): string {
  return ENTITY_NAME_MAPPING[key] || 'Unknown';
}

/**
 * 필드 배열을 기반으로 Swagger 스키마 생성
 */
export function createFieldBasedSchema(
  fields: readonly string[],
  entityName: string
): any {
  const nestedFields = fieldsToNestedObject(fields);

  function buildSchemaProperties(
    fieldObj: Record<string, any>,
    currentEntityName: string
  ): any {
    const properties: any = {};

    Object.keys(fieldObj).forEach((key) => {
      const value = fieldObj[key];

      if (value === true) {
        // 단일 필드
        const fieldInfo = FIELD_METADATA[currentEntityName]?.[key];
        if (fieldInfo) {
          properties[key] = buildFieldProperty(fieldInfo);
        } else {
          console.warn(
            `❌ Missing field metadata for ${currentEntityName}.${key} - Please add to FIELD_METADATA`
          );
          properties[key] = { type: 'string' };
        }
      } else {
        // 중첩된 객체
        const nestedEntityName = getNestedEntityName(key);
        properties[key] = {
          type: 'object',
          properties: buildSchemaProperties(value, nestedEntityName),
          required: Object.keys(value),
        };
      }
    });

    return properties;
  }

  const properties = buildSchemaProperties(nestedFields, entityName);

  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
  };
}

/**
 * EntityFieldInfo를 OpenAPI 속성으로 변환
 */
function buildFieldProperty(fieldInfo: EntityFieldInfo): any {
  const property: any = {
    type: fieldInfo.isArray ? 'array' : fieldInfo.type,
  };

  // 조건부 속성 추가
  if (fieldInfo.format) property.format = fieldInfo.format;
  if (fieldInfo.description) property.description = fieldInfo.description;
  if (fieldInfo.example !== undefined) property.example = fieldInfo.example;
  if (fieldInfo.enum) property.enum = fieldInfo.enum;
  if (fieldInfo.nullable) property.nullable = fieldInfo.nullable;

  // 배열 타입인 경우 items 추가
  if (fieldInfo.isArray && fieldInfo.items) {
    property.items = fieldInfo.items;
    if (fieldInfo.example) property.example = fieldInfo.example;
  }

  return property;
}

/**
 * 엔티티 필드 메타데이터 검증 함수
 */
export function validateEntityMetadata(
  entityName: string,
  entityFields: string[]
): ValidationResult {
  if (!FIELD_METADATA[entityName]) {
    console.warn(
      `⚠️  Entity ${entityName} has no metadata defined in FIELD_METADATA`
    );
    return {
      entityName,
      missingFields: entityFields,
      extraFields: [],
      isValid: false,
    };
  }

  const metadataFields = Object.keys(FIELD_METADATA[entityName]);
  const missingFields = entityFields.filter(
    (field) => !metadataFields.includes(field)
  );
  const extraFields = metadataFields.filter(
    (field) => !entityFields.includes(field)
  );

  if (missingFields.length > 0) {
    console.warn(
      `❌ Missing field metadata for ${entityName}:`,
      missingFields.join(', ')
    );
  }

  if (extraFields.length > 0) {
    console.warn(
      `🔍 Extra field metadata for ${entityName}:`,
      extraFields.join(', ')
    );
  }

  return {
    entityName,
    missingFields,
    extraFields,
    isValid: missingFields.length === 0 && extraFields.length === 0,
  };
}

/**
 * 모든 엔티티에 대한 메타데이터 완성도 확인
 */
export function checkMetadataCompleteness(): void {
  const entityNames = Object.keys(FIELD_METADATA);
  const coreEntities = [
    'Meeting',
    'MeetingParticipant',
    'WorkspaceMember',
    'Resource',
    'Space',
    'Workspace',
    'User',
  ];

  console.log('📋 FIELD_METADATA Completeness Check:');
  console.log(`Total entities with metadata: ${entityNames.length}`);

  const missingCoreEntities = coreEntities.filter(
    (entity) => !entityNames.includes(entity)
  );
  if (missingCoreEntities.length > 0) {
    console.warn(`❌ Missing core entities:`, missingCoreEntities.join(', '));
  } else {
    console.log('✅ All core entities have metadata defined');
  }

  // 각 엔티티의 메타데이터 통계
  entityNames.forEach((entityName) => {
    const fieldCount = Object.keys(FIELD_METADATA[entityName]).length;
    console.log(`  - ${entityName}: ${fieldCount} fields`);
  });
}
