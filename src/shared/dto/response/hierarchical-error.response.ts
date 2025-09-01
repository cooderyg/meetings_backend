import { ApiProperty } from '@nestjs/swagger';
import { HierarchicalErrorCode } from '../../const/hierarchical-error-code.const';

/**
 * 계층적 에러 응답 DTO
 * 
 * AppError에서 발생하는 계층적 에러 코드 기반의 응답 스키마
 * 클라이언트에서 i18n 처리를 위한 구조화된 에러 정보 제공
 */
export class HierarchicalErrorResponse {
  @ApiProperty({
    description: '계층적 에러 코드 (domain.action.reason)',
    example: 'meeting.publish.isDraft',
    type: 'string',
  })
  code: HierarchicalErrorCode;

  @ApiProperty({
    description: '에러 컨텍스트 정보 (i18n 템플릿 변수용)',
    example: {
      currentStatus: 'DRAFT',
      requiredStatus: 'COMPLETED',
    },
    required: false,
    additionalProperties: true,
  })
  context?: Record<string, any>;

  constructor(code: HierarchicalErrorCode, context?: Record<string, any>) {
    this.code = code;
    this.context = context;
  }
}

/**
 * 표준 에러 응답 DTO (기존 시스템과의 호환성)
 * 
 * BadRequestException, NotFoundException 등 일반적인 HTTP 예외용
 */
export class StandardErrorResponse {
  @ApiProperty({
    description: '에러 코드',
    example: 'VALIDATION_FAILED',
    type: 'string',
  })
  code: string;

  @ApiProperty({
    description: '사용자 친화적 에러 메시지',
    example: '입력한 정보를 다시 확인해주세요',
    type: 'string',
  })
  message: string;

  @ApiProperty({
    description: '추가 상세 정보',
    example: {
      validationErrors: ['이름은 필수 입력입니다', '이메일 형식이 올바르지 않습니다']
    },
    required: false,
    additionalProperties: true,
  })
  details?: any;

  constructor(code: string, message: string, details?: any) {
    this.code = code;
    this.message = message;
    this.details = details;
  }
}

/**
 * 통합 에러 응답 래퍼
 * 
 * 모든 타입의 에러를 처리할 수 있는 유니온 타입
 */
export type ErrorResponseDto = HierarchicalErrorResponse | StandardErrorResponse;

/**
 * HTTP 상태코드별 에러 응답 그룹
 * 
 * Swagger 명세에서 상태코드별로 가능한 에러들을 그룹화
 */
export interface ErrorResponseGroup {
  /** HTTP 상태코드 */
  status: number;
  /** 상태코드 설명 */
  description: string;
  /** 해당 상태코드에서 발생 가능한 에러 코드들 */
  errorCodes: HierarchicalErrorCode[];
  /** 예시 응답들 */
  examples: Record<string, {
    description: string;
    value: HierarchicalErrorResponse;
  }>;
}