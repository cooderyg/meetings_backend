import { EntityMetadata } from '../types/metadata.types';
import {
  createUuidField,
  createEnumField,
  createStringField,
  createDateTimeField,
  createObjectField,
} from '../schema/field-mapper';
import { SubscriptionTier } from '../../../domain/workspace/entity/workspace.entity';

export const WORKSPACE_METADATA: EntityMetadata = {
  id: createUuidField(
    '워크스페이스 고유 식별자',
    'e720eee0-2997-4d27-af68-d5de5b84f911'
  ),
  name: createStringField('워크스페이스 이름', '홍길동 워크스페이스'),
  subscriptionTier: createEnumField(
    SubscriptionTier,
    '구독 티어',
    SubscriptionTier.FREE
  ),
  imagePath: createStringField(
    '워크스페이스 이미지 경로',
    '/images/workspace/ws123.jpg',
    true
  ),
  settings: createObjectField('워크스페이스 설정', {
    theme: 'light',
    language: 'ko',
  }),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};
