import { Type } from '@nestjs/common';
import { fieldsToNestedObject } from './field.util';

/**
 * 필드 배열을 기반으로 Swagger 스키마 생성
 */

interface EntityFieldInfo {
  type: string;
  format?: string;
  description?: string;
  example?: any;
  enum?: any[];
  enumName?: string;
  nullable?: boolean;
  isArray?: boolean;
}

/**
 * Entity별 필드 메타데이터 매핑
 */
const FIELD_METADATA: Record<string, Record<string, EntityFieldInfo>> = {
  Meeting: {
    id: {
      type: 'string',
      format: 'uuid',
      description: '미팅 고유 식별자',
      example: '123e4567-e89b-12d3-a456-426614174000'
    },
    status: {
      type: 'string',
      description: '미팅 진행 상태',
      enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'PUBLISHED'],
      enumName: 'MeetingStatus',
      example: 'DRAFT'
    },
    tags: {
      type: 'array',
      description: '미팅 태그 목록',
      example: ['중요', '주간회의', '기획'],
      isArray: true
    },
    memo: {
      type: 'string',
      description: '미팅 메모',
      example: '이번 회의는 중요한 안건을 다룹니다.',
      nullable: true
    },
    summary: {
      type: 'string', 
      description: 'AI 생성 미팅 요약',
      example: '회의에서 논의된 주요 안건과 결정 사항입니다.',
      nullable: true
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: '생성일시',
      example: '2025-08-30T09:28:30.974Z'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time', 
      description: '수정일시',
      example: '2025-08-30T09:28:30.974Z'
    }
  },
  Resource: {
    id: {
      type: 'string',
      format: 'uuid',
      description: '리소스 고유 식별자',
      example: '1a695e8e-4ee5-4bb9-bde7-203b8d5dbbfa'
    },
    title: {
      type: 'string',
      description: '리소스 제목',
      example: 'My Meeting'
    },
    type: {
      type: 'string',
      description: '리소스 타입',
      enum: ['space', 'meeting'],
      enumName: 'ResourceType',
      example: 'meeting'
    },
    visibility: {
      type: 'string',
      description: '리소스 가시성',
      enum: ['public', 'private'],
      enumName: 'ResourceVisibility',
      example: 'public'
    },
    path: {
      type: 'string',
      description: 'LTree 계층 경로',
      example: 'e720eee0-2997-4d27-af68-d5de5b84f911.1756546110974'
    }
  },
  WorkspaceMember: {
    id: {
      type: 'string',
      format: 'uuid',
      description: '워크스페이스 멤버 고유 식별자',
      example: '886bd0c1-8ea0-4a31-ad31-481994bfc1ba'
    },
    firstName: {
      type: 'string',
      description: '사용자 이름',
      example: '홍길'
    },
    lastName: {
      type: 'string',
      description: '사용자 성',
      example: '동'
    },
    isActive: {
      type: 'boolean',
      description: '워크스페이스 멤버 활성화 상태',
      example: true
    }
  },
  Workspace: {
    id: {
      type: 'string',
      format: 'uuid',
      description: '워크스페이스 고유 식별자',
      example: 'e720eee0-2997-4d27-af68-d5de5b84f911'
    },
    name: {
      type: 'string',
      description: '워크스페이스 이름',
      example: '홍길동 워크스페이스'
    }
  },
  Space: {
    id: {
      type: 'string',
      format: 'uuid',
      description: '스페이스 고유 식별자',
      example: '123e4567-e89b-12d3-a456-426614174000'
    },
    description: {
      type: 'string',
      description: '스페이스 설명',
      example: 'This is a space for my project',
      nullable: true
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: '생성일시',
      example: '2025-08-30T09:28:30.974Z'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: '수정일시', 
      example: '2025-08-30T09:28:30.974Z'
    }
  }
};

/**
 * 필드 배열을 기반으로 Swagger 스키마 객체 생성
 */
export function createFieldBasedSchema(
  fields: readonly string[],
  entityName: string
): any {
  const nestedFields = fieldsToNestedObject(fields);
  
  function buildSchemaProperties(fieldObj: Record<string, any>, currentEntityName: string): any {
    const properties: any = {};
    
    Object.keys(fieldObj).forEach(key => {
      const value = fieldObj[key];
      
      if (value === true) {
        // 단일 필드
        const fieldInfo = FIELD_METADATA[currentEntityName]?.[key];
        if (fieldInfo) {
          properties[key] = {
            type: fieldInfo.isArray ? 'array' : fieldInfo.type,
            ...(fieldInfo.format && { format: fieldInfo.format }),
            ...(fieldInfo.description && { description: fieldInfo.description }),
            ...(fieldInfo.example && { example: fieldInfo.example }),
            ...(fieldInfo.enum && { enum: fieldInfo.enum }),
            ...(fieldInfo.enumName && { enumName: fieldInfo.enumName }),
            ...(fieldInfo.nullable && { nullable: fieldInfo.nullable }),
            ...(fieldInfo.isArray && { 
              items: { type: 'string' },
              example: fieldInfo.example 
            })
          };
        } else {
          // 기본 타입
          properties[key] = { type: 'string' };
        }
      } else {
        // 중첩된 객체
        const nestedEntityName = getNestedEntityName(key);
        properties[key] = {
          type: 'object',
          properties: buildSchemaProperties(value, nestedEntityName),
          required: Object.keys(value)
        };
      }
    });
    
    return properties;
  }
  
  const properties = buildSchemaProperties(nestedFields, entityName);
  
  return {
    type: 'object',
    properties,
    required: Object.keys(properties)
  };
}

/**
 * 키 이름을 기반으로 Entity 이름 추론
 */
function getNestedEntityName(key: string): string {
  const mapping: Record<string, string> = {
    'resource': 'Resource',
    'workspace': 'Workspace', 
    'owner': 'WorkspaceMember',
    'meeting': 'Meeting',
    'space': 'Space'
  };
  
  return mapping[key] || 'Unknown';
}