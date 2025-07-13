import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';
import { AppConfig } from '../app-config/app-config';
import { LOGGER_CONSTANTS } from './const/logger.const';
import { ClsService } from 'nestjs-cls';

/**
 * HTTP 요청/응답을 로깅하는 미들웨어
 * - 요청 ID 생성 및 설정
 * - 요청 시작 로깅
 * - 응답 상태에 따른 로그 레벨 조정
 * - 성능 모니터링
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly appConfig: AppConfig,
    private readonly cls: ClsService,
  ) {}

  /**
   * HTTP 요청 처리 및 로깅
   * @param req Express Request 객체
   * @param res Express Response 객체
   * @param next 다음 미들웨어
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // 로드밸런서 헬스체크 등 시스템 요청은 로깅하지 않음
    if (this.isHealthCheck(req)) {
      next();
      return;
    }

    // API 버전 정보를 요청 객체에 추가
    req.apiVersion = this.appConfig.apiVersion;

    // CLS에서 자동 생성된 ID 가져오기 또는 헤더에서 추출한 ID 사용
    const requestId = (req.headers['x-request-id'] as string) || this.cls.getId();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-api-version', this.appConfig.apiVersion);

    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent');
    const startTime = Date.now();

    this.logger.debug(
      LOGGER_CONSTANTS.MESSAGE_TEMPLATES.HTTP.STARTED(method, originalUrl),
      LOGGER_CONSTANTS.CONTEXTS.HTTP,
      {
        ip,
        userAgent,
      },
    );

    // 응답 완료 시 상태 코드에 따른 로깅
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // 5xx 에러: 서버 내부 오류로 에러 로그
      if (statusCode >= 500) {
        this.logger.error(
          LOGGER_CONSTANTS.MESSAGE_TEMPLATES.HTTP.FAILED(
            method,
            originalUrl,
            statusCode,
            duration,
          ),
          undefined,
          LOGGER_CONSTANTS.CONTEXTS.HTTP,
        );
      } else if (statusCode >= 400) {
        // 4xx 에러: 클라이언트 오류로 경고 로그
        this.logger.warn(
          LOGGER_CONSTANTS.MESSAGE_TEMPLATES.HTTP.FAILED(
            method,
            originalUrl,
            statusCode,
            duration,
          ),
          LOGGER_CONSTANTS.CONTEXTS.HTTP,
        );
      }

      // 설정된 임계값보다 느린 요청에 대한 성능 로깅
      if (duration > LOGGER_CONSTANTS.PERFORMANCE_THRESHOLD.HTTP_REQUEST_SLOW) {
        this.logger.logPerformance('HTTP Request', duration, {
          method,
          url: originalUrl,
          statusCode,
        });
      }
    });

    next();
  }

  /**
   * 헬스체크 요청 판별
   * @param req Express Request 객체
   * @returns 헬스체크 요청 여부
   */
  private isHealthCheck(req: Request): boolean {
    const { originalUrl, method } = req;
    const userAgent = req.get('user-agent') || '';
    return (
      // 설정된 헬스체크 경로와 일치하는지 확인
      (LOGGER_CONSTANTS.HEALTH_CHECK_PATHS as readonly string[]).includes(
        originalUrl,
      ) &&
      method === 'GET' &&
      // 로드밸런서나 쿠버네티스 프로브의 User-Agent 확인
      LOGGER_CONSTANTS.HEALTH_CHECK_USER_AGENTS.some((agent) =>
        userAgent.includes(agent),
      )
    );
  }
}
