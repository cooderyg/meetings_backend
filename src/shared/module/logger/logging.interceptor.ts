import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { Request, Response } from 'express';
import { LOGGER_CONSTANTS } from './const/logger.const';

/**
 * 컨트롤러 메서드 실행을 로깅하는 인터셉터
 * - 메서드 시작/완료 시간 추적
 * - 성능 임계값 초과 시 경고 로그
 * - 에러 발생 시 스택 트레이스 포함 로깅
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  /**
   * 컨트롤러 메서드 실행을 감시하고 로깅
   * @param context 실행 컨텍스트
   * @param next 다음 핸들러
   * @returns Observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // WebSocket, RPC 등 비 HTTP 요청은 로깅하지 않음
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 로드밸런서 헬스체크 등 시스템 요청 제외
    if (
      (LOGGER_CONSTANTS.HEALTH_CHECK_PATHS as readonly string[]).includes(
        request.url,
      )
    ) {
      return next.handle();
    }


    // 실행되는 컨트롤러와 메서드 정보 추출
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const controllerPath = `${controllerName}.${handlerName}`;

    // 요청 정보
    const { method, url } = request;

    // 성능 측정을 위한 시작 시간 기록
    const startTime = Date.now();

    this.logger.debug(
      LOGGER_CONSTANTS.MESSAGE_TEMPLATES.CONTROLLER.STARTED(controllerPath),
      LOGGER_CONSTANTS.CONTEXTS.CONTROLLER,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          // 성공적인 실행 완료 처리
          const duration = Date.now() - startTime;

          this.logger.debug(
            LOGGER_CONSTANTS.MESSAGE_TEMPLATES.CONTROLLER.COMPLETED(
              controllerPath,
              response.statusCode,
              duration,
            ),
            LOGGER_CONSTANTS.CONTEXTS.CONTROLLER,
          );

          // 설정된 임계값보다 느린 경우 성능 로그 기록
          if (
            duration > LOGGER_CONSTANTS.PERFORMANCE_THRESHOLD.CONTROLLER_SLOW
          ) {
            this.logger.logPerformance(controllerPath, duration, {
              method,
              url,
              statusCode: response.statusCode,
            });
          }
        },
        error: (error: Error) => {
          // 에러 발생 시 상세 정보와 함께 로깅
          const duration = Date.now() - startTime;
          this.logger.error(
            LOGGER_CONSTANTS.MESSAGE_TEMPLATES.CONTROLLER.FAILED(
              controllerPath,
              error.message,
            ),
            error.stack,
            LOGGER_CONSTANTS.CONTEXTS.CONTROLLER,
            {
              duration,
              method,
              url,
              statusCode: (error as { statusCode?: number })?.statusCode,
            },
          );
        },
      }),
    );
  }
}
