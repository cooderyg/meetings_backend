import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import {
  getMatchingErrorCodes,
  groupErrorCodesByStatus,
  getStatusDescription,
  generateErrorCodeExample,
} from '../util/error-pattern.util';
import { HierarchicalErrorResponse } from '../dto/response/hierarchical-error.response';
import { HierarchicalErrorCode } from '../const/hierarchical-error-code.const';

/**
 * 도메인 에러 자동 Swagger 명세 데코레이터
 *
 * domain.action 패턴을 입력하면 해당하는 모든 계층적 에러 코드를
 * 자동으로 추출하여 Swagger 응답 명세에 추가합니다.
 *
 * @param pattern - 매칭할 에러 패턴 (예: 'meeting.create', 'workspace.member')
 * @param options - 추가 옵션
 *
 * @example
 * ```typescript
 * @ApiDomainErrors('meeting.publish')
 * // 자동으로 다음 에러들을 Swagger에 명세:
 * // - 400: meeting.publish.isDraft, meeting.publish.alreadyPublished
 * // - 403: meeting.publish.notAuthorized
 *
 * @ApiDomainErrors('meeting.create', { includeCommon: true })
 * // meeting.create.* 에러들 + 공통 에러들 포함
 * ```
 */
export function ApiDomainErrors(
  pattern: string,
  options: {
    /** 공통 에러들 포함 여부 (401, 403, 500 등) */
    includeCommon?: boolean;
    /** 추가 설명 */
    description?: string;
  } = {}
) {
  const { includeCommon = false, description } = options;

  // 패턴에 매칭되는 에러 코드들 추출
  const matchingErrorCodes = getMatchingErrorCodes(pattern);

  // 공통 에러 코드들 추가 (선택적)
  const commonErrorCodes: HierarchicalErrorCode[] = includeCommon
    ? [
        'auth.access.denied',
        'auth.token.invalid',
        'auth.token.expired',
        'workspace.access.denied',
        'system.internal.error',
      ]
    : [];

  const allErrorCodes = [...matchingErrorCodes, ...commonErrorCodes];

  // HTTP 상태코드별로 그룹화
  const errorGroups = groupErrorCodesByStatus(allErrorCodes);

  // Swagger 응답 데코레이터들 생성
  const decorators = Object.entries(errorGroups).map(([status, errorCodes]) => {
    const statusCode = parseInt(status);
    const statusDescription = getStatusDescription(statusCode);

    // 각 에러 코드별 예시 생성
    const examples: Record<string, any> = {};
    errorCodes.forEach((errorCode) => {
      const exampleContext = generateErrorCodeExample(errorCode);
      const exampleKey = errorCode.replace(/\./g, '_'); // 'meeting.publish.isDraft' -> 'meeting_publish_isDraft'

      examples[exampleKey] = {
        summary: errorCode,
        description: `${errorCode} 에러 발생`,
        value: {
          success: false,
          error: {
            code: errorCode,
            ...(Object.keys(exampleContext).length > 0 && {
              context: exampleContext,
            }),
          },
        },
      };
    });

    return ApiResponse({
      status: statusCode,
      description: description
        ? `${statusDescription} - ${description}`
        : `${statusDescription} (${errorCodes.length}개 에러 타입)`,
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: errorCodes,
                description: '계층적 에러 코드',
              },
              context: {
                type: 'object',
                description: '에러 컨텍스트 정보',
                additionalProperties: true,
              },
            },
            required: ['code'],
          },
        },
        required: ['success', 'error'],
      },
      examples: examples,
    });
  });

  return applyDecorators(
    ApiExtraModels(HierarchicalErrorResponse),
    ...decorators
  );
}

/**
 * 특정 에러 코드들을 직접 명세하는 데코레이터
 *
 * @param errorCodes - 명세할 에러 코드 배열
 * @param description - 설명
 *
 * @example
 * ```typescript
 * @ApiSpecificErrors([
 *   'meeting.publish.isDraft',
 *   'meeting.publish.alreadyPublished'
 * ], '미팅 발행 관련 에러')
 * ```
 */
export function ApiSpecificErrors(
  errorCodes: HierarchicalErrorCode[],
  description?: string
) {
  const errorGroups = groupErrorCodesByStatus(errorCodes);

  const decorators = Object.entries(errorGroups).map(([status, codes]) => {
    const statusCode = parseInt(status);
    const statusDescription = getStatusDescription(statusCode);

    const examples: Record<string, any> = {};
    codes.forEach((errorCode) => {
      const exampleContext = generateErrorCodeExample(errorCode);
      const exampleKey = errorCode.replace(/\./g, '_');

      examples[exampleKey] = {
        summary: errorCode,
        description: `${errorCode} 에러`,
        value: {
          success: false,
          error: {
            code: errorCode,
            ...(Object.keys(exampleContext).length > 0 && {
              context: exampleContext,
            }),
          },
        },
      };
    });

    return ApiResponse({
      status: statusCode,
      description: description
        ? `${statusDescription} - ${description}`
        : statusDescription,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: codes,
                description: '계층적 에러 코드',
              },
              context: {
                type: 'object',
                description: '에러 컨텍스트 정보',
                additionalProperties: true,
              },
            },
            required: ['code'],
          },
        },
        required: ['success', 'error'],
      },
      examples: examples,
    });
  });

  return applyDecorators(
    ApiExtraModels(HierarchicalErrorResponse),
    ...decorators
  );
}

/**
 * 공통 HTTP 에러들을 명세하는 데코레이터
 *
 * @example
 * ```typescript
 * @ApiCommonErrors()
 * // 401, 403, 500 등 공통 에러들을 자동 명세
 * ```
 */
export function ApiCommonErrors() {
  const commonErrorCodes: HierarchicalErrorCode[] = [
    'auth.token.invalid',
    'auth.token.expired',
    'auth.access.denied',
    'workspace.access.denied',
    'system.internal.error',
  ];

  return ApiSpecificErrors(commonErrorCodes, '공통 시스템 에러');
}
