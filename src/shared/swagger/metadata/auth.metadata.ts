import { EntityMetadata } from '../types/metadata.types';
import {
  createUuidField,
  createEnumField,
  createStringField,
  createDateTimeField,
  createObjectField,
} from '../schema/field-mapper';
import {
  LoginMethod,
  LoginEventType,
} from '../../../domain/auth/entity/login-event.entity';

export const LOGIN_EVENT_METADATA: EntityMetadata = {
  id: createUuidField('로그인 이벤트 고유 식별자'),
  loginMethod: createEnumField(
    LoginMethod,
    '로그인 방법',
    LoginMethod.GOOGLE_OAUTH
  ),
  eventType: createEnumField(
    LoginEventType,
    '이벤트 타입',
    LoginEventType.SUCCESS
  ),
  ipAddress: createStringField('IP 주소', '192.168.1.1', true),
  userAgent: createStringField(
    '사용자 에이전트',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    true
  ),
  failureReason: createStringField('실패 사유', 'Invalid credentials', true),
  sessionId: createStringField('세션 ID', 'sess_123456789', true),
  metadata: createObjectField(
    '추가 메타데이터',
    {
      deviceFingerprint: 'abc123',
      location: { country: 'KR', city: 'Seoul' },
    },
    true
  ),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};
