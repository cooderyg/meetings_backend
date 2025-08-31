import { EntityMetadata } from '../types/metadata.types';
import {
  createUuidField,
  createEnumField,
  createStringField,
  createDateTimeField,
} from '../schema/field-mapper';
import {
  ResourceType,
  ResourceVisibility,
} from '../../../domain/resource/entity/resource.entity';

export const SPACE_METADATA: EntityMetadata = {
  id: createUuidField('스페이스 고유 식별자'),
  description: createStringField(
    '스페이스 설명',
    'This is a space for my project',
    true
  ),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

export const RESOURCE_METADATA: EntityMetadata = {
  id: createUuidField(
    '리소스 고유 식별자',
    '1a695e8e-4ee5-4bb9-bde7-203b8d5dbbfa'
  ),
  title: createStringField('리소스 제목', 'My Meeting'),
  type: createEnumField(ResourceType, '리소스 타입', ResourceType.MEETING),
  visibility: createEnumField(
    ResourceVisibility,
    '리소스 가시성',
    ResourceVisibility.PUBLIC
  ),
  path: createStringField(
    'LTree 계층 경로',
    'e720eee0-2997-4d27-af68-d5de5b84f911.1756546110974'
  ),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};
