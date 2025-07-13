import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '../module/logger/logger.service';
import { ExceptionLogMetadata } from '../module/logger/type/logger.type';
import { AppException } from '../exception/app.exception';
import { ERROR_CODES } from '../const/error-code.const';
import { AppConfig } from '../module/app-config/app-config';
import { ErrorResponse } from '../type/error-response.types';

export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: any;
  timestamp?: string;
}

/**
 * 글로벌 예외 필터
 *
 * 애플리케이션에서 발생하는 모든 예외를 캐치하여 표준화된 에러 응답을 생성합니다.
 *
 * 처리 순서:
 * 1. AppException - 비즈니스 로직 예외
 * 2. BadRequestException - 유효성 검증 오류
 * 3. NotFoundException - 리소스 누락 오류
 * 4. HttpException - 기타 HTTP 예외
 * 5. Unknown Exception - 예상치 못한 예외
 *
 * 각 예외는 적절한 로그 레벨로 로깅되며, 개발 환경에서는 디버그 정보도 포함됩니다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly appConfig: AppConfig,
  ) {}

  /**
   * 예외 처리 메인 메서드
   *
   * 모든 예외를 캐치하여 StandardResponse 형태로 응답합니다.
   *
   * @param exception - 발생한 예외
   * @param host - NestJS ArgumentsHost
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HTTP 상태 코드 결정
    const status = this.getHttpStatus(exception);
    const requestId = request?.requestId;

    // 에러 응답 객체 생성
    const errorDetails = this.buildErrorResponse(exception);

    // 예외 로깅
    this.logException(exception, request, status);

    // 표준 응답 형태로 래핑
    const standardResponse: StandardResponse<unknown> = {
      success: false,
      error: errorDetails,
    };

    response.status(status).json(standardResponse);
  }

  /**
   * 예외 타입에 따른 HTTP 상태 코드 결정
   *
   * @param exception - 발생한 예외
   * @returns HTTP 상태 코드
   */
  private getHttpStatus(exception: unknown): number {
    if (
      exception instanceof AppException ||
      exception instanceof HttpException
    ) {
      return exception.getStatus();
    }
    // 예상치 못한 예외는 500 오류로 처리
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 예외 타입에 따른 에러 응답 객체 생성
   *
   * 예외 타입 우선순위:
   * 1. AppException (가장 구체적)
   * 2. BadRequestException (유효성 검증 오류)
   * 3. NotFoundException (리소스 누락)
   * 4. HttpException (기타 HTTP 예외)
   * 5. Unknown (예상치 못한 예외)
   *
   * @param exception - 발생한 예외
   * @returns 표준화된 에러 응답 객체
   */
  private buildErrorResponse(exception: unknown): ErrorResponse {
    try {
      // 비즈니스 로직 예외 (가장 우선)
      if (exception instanceof AppException) {
        return this.buildAppExceptionResponse(exception);
      }

      // 유효성 검증 오류
      if (exception instanceof BadRequestException) {
        return this.buildValidationErrorResponse(exception);
      }

      // 리소스 누락 오류
      if (exception instanceof NotFoundException) {
        return this.buildNotFoundErrorResponse(exception);
      }

      // 기타 HTTP 예외
      if (exception instanceof HttpException) {
        return this.buildHttpExceptionResponse(exception);
      }

      // 예상치 못한 예외
      return this.buildUnknownExceptionResponse(exception);
    } catch (error) {
      // 에러 응답 생성 중 오류 발생 시 로깅 후 기본 에러 응답 반환
      this.loggerService.error(
        'Error building error response',
        (error as Error).stack || 'No stack trace',
        'GlobalExceptionFilter',
      );
      return this.buildFallbackErrorResponse();
    }
  }

  /**
   * AppException에 대한 에러 응답 생성
   *
   * ERROR_DEFINITIONS에 정의된 에러 정보를 기반으로 생성
   *
   * @param exception - AppException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildAppExceptionResponse(exception: AppException): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: exception.code,
      message: exception.message,
      userMessage: exception.message,
      ...(exception.details && { details: exception.details }),
    };

    if (this.appConfig.nodeEnv === 'development') {
      errorResponse.debug = {
        errorCode: exception.errorDef.code,
        internalMessage: exception.message,
        stack: exception.stack,
        timestamp: new Date().toISOString(),
      };
    }

    return errorResponse;
  }

  /**
   * 유효성 검증 오류에 대한 에러 응답 생성
   *
   * ValidationPipe에서 발생하는 BadRequestException을 처리
   *
   * @param exception - BadRequestException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildValidationErrorResponse(
    exception: BadRequestException,
  ): ErrorResponse {
    const response = exception.getResponse() as { message?: string[] | string };
    // 메시지가 배열인지 문자열인지 확인 후 배열로 변환
    const messages = Array.isArray(response.message)
      ? response.message
      : [response.message || exception.message];

    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.VALIDATION_FAILED.code,
      message: messages.join(', '),
      userMessage: '입력한 정보를 다시 확인해주세요',
      details: { validationErrors: messages },
    };

    if (this.appConfig.nodeEnv === 'development') {
      errorResponse.debug = {
        type: 'ValidationException',
        originalResponse: response,
        stack: exception.stack,
        timestamp: new Date().toISOString(),
      };
    }

    return errorResponse;
  }

  /**
   * 리소스 누락 오류에 대한 에러 응답 생성
   *
   * @param exception - NotFoundException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildNotFoundErrorResponse(
    exception: NotFoundException,
  ): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.RESOURCE_NOT_FOUND.code,
      message: exception.message,
      userMessage: '요청하신 정보를 찾을 수 없습니다',
    };

    if (this.appConfig.nodeEnv === 'development') {
      errorResponse.debug = {
        type: 'NotFoundException',
        stack: exception.stack,
        timestamp: new Date().toISOString(),
      };
    }

    return errorResponse;
  }

  /**
   * 기타 HTTP 예외에 대한 에러 응답 생성
   *
   * @param exception - HttpException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildHttpExceptionResponse(exception: HttpException): ErrorResponse {
    const response = exception.getResponse();
    // 예외 응답이 문자열인지 객체인지 확인 후 메시지 추출
    const responseMessage =
      typeof response === 'string'
        ? response
        : (response as { message?: string }).message || exception.message;

    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR.code,
      message: responseMessage,
      userMessage: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };

    if (this.appConfig.nodeEnv === 'development') {
      errorResponse.debug = {
        originalResponse: response,
        stack: exception.stack,
        timestamp: new Date().toISOString(),
      };
    }

    return errorResponse;
  }

  /**
   * 예상치 못한 예외에 대한 에러 응답 생성
   *
   * @param exception - 예상치 못한 예외
   * @returns 에러 응답 객체
   */
  private buildUnknownExceptionResponse(exception: unknown): ErrorResponse {
    // 운영 환경에서는 보안상 상세 오류 정보를 숨김
    const message =
      this.appConfig.nodeEnv === 'production'
        ? '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        : exception instanceof Error
          ? exception.message || 'Unknown error'
          : 'Unknown error';

    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR.code,
      message,
      userMessage: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };

    if (this.appConfig.nodeEnv === 'development') {
      errorResponse.debug = {
        type: 'UnhandledException',
        originalError: exception,
        stack: exception instanceof Error ? exception.stack : undefined,
        timestamp: new Date().toISOString(),
      };
    }

    return errorResponse;
  }

  /**
   * 기본 에러 응답 생성 (예외 처리 중 오류 발생 시 사용)
   *
   * @returns 기본 에러 응답 객체
   */
  private buildFallbackErrorResponse(): ErrorResponse {
    return {
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR.code,
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      userMessage: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  /**
   * 예외 로깅 처리
   *
   * 예외 타입에 따라 적절한 로그 레벨로 로깅합니다.
   * AppException은 설정된 logLevel을 사용하고,
   * 기타 예외는 error 레벨로 로깅합니다.
   *
   * @param exception - 발생한 예외
   * @param request - Express Request 객체
   * @param status - HTTP 상태 코드
   * @param requestId - 요청 ID (옵션)
   */
  private logException(
    exception: unknown,
    request: Request,
    status: number,
  ): void {
    // 로깅에 포함할 메타데이터 준비
    const logMeta: ExceptionLogMetadata = {
      status,
      path: request?.url,
      method: request?.method,
      ip: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    };

    if (exception instanceof AppException) {
      this.logAppException(exception, logMeta);
    } else {
      this.logUnhandledException(exception, logMeta);
    }
  }

  /**
   * AppException 로깅 처리
   *
   * 예외에 설정된 logLevel에 따라 적절한 로그 레벨로 로깅
   *
   * @param exception - AppException 인스턴스
   * @param logMeta - 로깅 메타데이터
   * @param requestId - 요청 ID (옵션)
   */
  private logAppException(
    exception: AppException,
    logMeta: ExceptionLogMetadata,
  ): void {
    const logMessage = `Business exception: [${exception.errorDef.code}] ${exception.message || 'No message'}`;
    const logContext = 'BusinessException';
    // 로깅에 포함할 메타데이터 준비
    const metaData = {
      ...logMeta,
      code: exception.code,
      details: exception.details,
      errorCode: exception.errorDef.code,
    };

    // 예외에 설정된 로그 레벨에 따라 로깅
    const logLevel = exception.logLevel as 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    switch (logLevel) {
      case 'error':
        this.loggerService.error(
          logMessage,
          exception.stack || 'No stack trace',
          logContext,
          metaData,
        );
        break;
      case 'warn':
        this.loggerService.warn(logMessage, logContext, metaData);
        break;
      case 'info':
        this.loggerService.log(logMessage, logContext, metaData);
        break;
      case 'debug':
        this.loggerService.debug(logMessage, logContext, metaData);
        break;
      case 'verbose':
        this.loggerService.verbose(logMessage, logContext, metaData);
        break;
      default:
        // fallback to error level
        this.loggerService.error(
          logMessage,
          exception.stack || 'No stack trace',
          logContext,
          metaData,
        );
        break;
    }
  }

  /**
   * 예상치 못한 예외 로깅 처리
   *
   * 모든 예상치 못한 예외는 error 레벨로 로깅
   *
   * @param exception - 예상치 못한 예외
   * @param logMeta - 로깅 메타데이터
   * @param requestId - 요청 ID (옵션)
   */
  private logUnhandledException(
    exception: unknown,
    logMeta: ExceptionLogMetadata,
  ): void {
    this.loggerService.error(
      `Unhandled exception: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
      exception instanceof Error ? exception.stack : undefined,
      'UnhandledException',
      logMeta,
    );
  }
}
