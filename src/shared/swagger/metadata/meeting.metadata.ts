import { EntityMetadata } from '../types/metadata.types';
import {
  createUuidField,
  createEnumField,
  createArrayField,
  createStringField,
  createDateTimeField,
} from '../schema/field-mapper';
import { MeetingStatus } from '../../../domain/meeting/entity/meeting.entity';

export const MEETING_METADATA: EntityMetadata = {
  id: createUuidField('미팅 고유 식별자'),
  status: createEnumField(MeetingStatus, '미팅 진행 상태', MeetingStatus.DRAFT),
  tags: createArrayField('string', '미팅 태그 목록', ['중요', '주간회의']),
  memo: createStringField('미팅 메모', '중요한 안건', true),
  summary: createStringField('AI 생성 미팅 요약', '회의 요약', true),
  deletedAt: createDateTimeField('삭제일시', true),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

export const MEETING_PARTICIPANT_METADATA: EntityMetadata = {
  id: createUuidField('미팅 참여자 고유 식별자'),
  guestName: createStringField('게스트 참여자 이름', '홍길동', true),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};

export const MEETING_RECORD_METADATA: EntityMetadata = {
  id: createUuidField('미팅 기록 고유 식별자'),
  time: {
    type: 'number',
    description: '기록 시간 (초)',
    example: 120,
  },
  content: createStringField('기록 내용', '회의 진행 상황을 기록합니다.'),
  createdAt: createDateTimeField('생성일시'),
  updatedAt: createDateTimeField('수정일시'),
};
