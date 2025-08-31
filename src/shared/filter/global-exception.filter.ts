import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '../module/logger/logger.service';
import { ExceptionLogMetadata } from '../module/logger/type/logger.type';
import { AppError } from '../exception/app.error';
import { ERROR_CODES } from '../const/error-code.const';
import { ErrorResponse } from '../type/error-response.types';
import { StandardResponse } from '../type/response.types';

/**
 * 글로벌 예외 필터
 *
 * 애플리케이션에서 발생하는 모든 예외를 캐치하여 표준화된 에러 응답을 생성합니다.
 *
 * 처리 순서:
 * 1. AppError - 비즈니스 로직 예외
 * 2. BadRequestException - 유효성 검증 오류
 * 3. NotFoundException - 리소스 누락 오류
 * 4. HttpException - 기타 HTTP 예외
 * 5. Unknown Exception - 예상치 못한 예외
 *
 * 각 예외는 적절한 로그 레벨로 로깅되며, 개발 환경에서는 디버그 정보도 포함됩니다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggerService: LoggerService) {}

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
    if (exception instanceof AppError || exception instanceof HttpException) {
      return exception.getStatus();
    }
    // 예상치 못한 예외는 500 오류로 처리
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 예외 타입에 따른 에러 응답 객체 생성
   *
   * 예외 타입 우선순위:
   * 1. AppError (가장 구체적)
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
      if (exception instanceof AppError) {
        return this.buildAppErrorResponse(exception);
      }

      // 유효성 검증 오류
      if (exception instanceof BadRequestException) {
        return this.buildValidationErrorResponse(exception);
      }

      // 리소스 누락 오류
      if (exception instanceof NotFoundException) {
        return this.buildNotFoundErrorResponse(exception);
      }

      // 인증 오류
      if (exception instanceof UnauthorizedException) {
        return this.buildUnauthorizedErrorResponse(exception);
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
        'GlobalExceptionFilter'
      );
      return this.buildFallbackErrorResponse();
    }
  }

  /**
   * AppError에 대한 에러 응답 생성
   *
   * 계층적 에러 코드를 기반으로 생성
   *
   * @param exception - AppError 인스턴스
   * @returns 에러 응답 객체
   */
  private buildAppErrorResponse(exception: AppError): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: exception.code as string,
      message: exception.message,
      ...(exception.context && { context: exception.context }),
    };

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
    _exception: BadRequestException
  ): ErrorResponse {
    const response = _exception.getResponse() as {
      message?: string[] | string;
    };
    // 메시지가 배열인지 문자열인지 확인 후 배열로 변환
    const messages = Array.isArray(response.message)
      ? response.message
      : [response.message || _exception.message];

    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.VALIDATION_FAILED,
      message: '입력한 정보를 다시 확인해주세요',
      details: { validationErrors: messages },
    };

    return errorResponse;
  }

  /**
   * 리소스 누락 오류에 대한 에러 응답 생성
   *
   * @param exception - NotFoundException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildNotFoundErrorResponse(
    _exception: NotFoundException
  ): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: '요청하신 정보를 찾을 수 없습니다',
    };

    return errorResponse;
  }

  /**
   * 인증 오류에 대한 에러 응답 생성
   *
   * @param exception - UnauthorizedException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildUnauthorizedErrorResponse(
    _exception: UnauthorizedException
  ): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.AUTH_UNAUTHORIZED,
      message: '인증이 필요합니다',
    };

    return errorResponse;
  }

  /**
   * 기타 HTTP 예외에 대한 에러 응답 생성
   *
   * @param exception - HttpException 인스턴스
   * @returns 에러 응답 객체
   */
  private buildHttpExceptionResponse(_exception: HttpException): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };

    return errorResponse;
  }

  /**
   * 예상치 못한 예외에 대한 에러 응답 생성
   *
   * @param exception - 예상치 못한 예외
   * @returns 에러 응답 객체
   */
  private buildUnknownExceptionResponse(_exception: unknown): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };

    return errorResponse;
  }

  /**
   * 기본 에러 응답 생성 (예외 처리 중 오류 발생 시 사용)
   *
   * @returns 기본 에러 응답 객체
   */
  private buildFallbackErrorResponse(): ErrorResponse {
    return {
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  /**
   * 예외 로깅 처리
   *
   * 예외 타입에 따라 적절한 로그 레벨로 로깅합니다.
   * AppError는 설정된 logLevel을 사용하고,
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
    status: number
  ): void {
    // 로깅에 포함할 메타데이터 준비
    const logMeta: ExceptionLogMetadata = {
      status,
      path: request?.url,
      method: request?.method,
      ip: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    };

    if (exception instanceof AppError) {
      this.logAppError(exception, logMeta);
    } else {
      this.logUnhandledException(exception, logMeta);
    }
  }

  /**
   * AppError 로깅 처리
   *
   * 예외에 설정된 logLevel에 따라 적절한 로그 레벨로 로깅
   *
   * @param exception - AppError 인스턴스
   * @param logMeta - 로깅 메타데이터
   */
  private logAppError(
    exception: AppError,
    logMeta: ExceptionLogMetadata
  ): void {
    const logMessage = `Business exception: [${String(exception.code)}]`;
    const logContext = 'BusinessException';
    // 로깅에 포함할 메타데이터 준비
    const metaData = {
      ...logMeta,
      code: exception.code,
      context: JSON.stringify(exception.context || {}),
    };

    // 예외에 설정된 로그 레벨에 따라 로깅
    const logLevel = exception.logLevel;
    switch (logLevel) {
      case 'error':
        this.loggerService.error(
          logMessage,
          exception.stack || 'No stack trace',
          logContext,
          metaData
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
          metaData
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
    logMeta: ExceptionLogMetadata
  ): void {
    this.loggerService.error(
      `Unhandled exception: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
      exception instanceof Error ? exception.stack : undefined,
      'UnhandledException',
      logMeta
    );
  }
}
