import { EntityMetadata } from '../types/metadata.types';
import {
  createUuidField,
  createStringField,
  createBooleanField,
  createDateTimeField,
  createObjectField,
} from '../schema/field-mapper';

export const USER_METADATA: EntityMetadata = {
  id: createUuidField('사용자 고유 식별자'),
  email: createStringField('사용자 이메일', 'user@example.com', false, 'email'),
  uid: createStringField('소셜 로그인 UID', 'google_123456789'),
  firstName: createStringField('사용자 이름', '홍길'),
  lastName: createStringField('사용자 성', '동'),
  isActive: createBooleanField('사용자 활성화 상태', true),
  lastLoginAt: createDateTimeField('마지막 로그인 시간', true),
  imagePath: createStringField(
    '프로필 이미지 경로',
    '/images/profile/user123.jpg',
    true
  ),
  settings: createObjectField('사용자 설정', {
    theme: 'dark',
    notifications: true,
  }),
  isDeleted: createBooleanField('삭제 여부', false),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

export const WORKSPACE_MEMBER_METADATA: EntityMetadata = {
  id: createUuidField(
    '워크스페이스 멤버 고유 식별자',
    '886bd0c1-8ea0-4a31-ad31-481994bfc1ba'
  ),
  firstName: createStringField('사용자 이름', '홍길'),
  lastName: createStringField('사용자 성', '동'),
  isActive: createBooleanField('워크스페이스 멤버 활성화 상태', true),
  imagePath: createStringField(
    '프로필 이미지 경로',
    '/images/profile/user123.jpg',
    true
  ),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};
