import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { AppConfig } from '../app-config/app-config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { LogMetadata } from './type/logger.type';
import { LOGGER_CONSTANTS } from './const/logger.const';

/**
 * Syslog RFC 5424 표준 로그 레벨 정의
 * 숫자가 낮을수록 높은 심각도를 의미
 */
const syslogLevels = {
  emerg: 0, // 시스템 사용 불가
  alert: 1, // 즉각 조치 필요
  crit: 2, // 심각한 오류
  error: 3, // 오류
  warn: 4, // 경고
  notice: 5, // 주목할 정보
  info: 6, // 일반 정보
  debug: 7, // 디버그 정보
};

/**
 * Syslog 레벨별 콘솔 출력 색상 매핑
 */
const syslogColors = {
  emerg: 'red',
  alert: 'magenta',
  crit: 'red',
  error: 'red',
  warn: 'yellow',
  notice: 'cyan',
  info: 'green',
  debug: 'blue',
};

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private readonly appConfig: AppConfig) {
    this.logger = this.createWinstonLogger();
  }

  /**
   * Winston 로거 인스턴스 생성
   * @returns 설정된 Winston 로거
   */
  private createWinstonLogger(): winston.Logger {
    const isProd = this.appConfig.nodeEnv === 'production';
    const logLevel = isProd
      ? LOGGER_CONSTANTS.LOG_LEVELS.PRODUCTION
      : LOGGER_CONSTANTS.LOG_LEVELS.DEVELOPMENT;

    const logger = winston.createLogger({
      levels: syslogLevels,
      level: logLevel,
      defaultMeta: {
        service: this.appConfig.appName,
        environment: this.appConfig.nodeEnv,
      },
      format: this.createFormat(),
      transports: this.createTransports(isProd),
    });

    // Syslog 색상 적용
    winston.addColors(syslogColors);

    return logger;
  }

  /**
   * 로그 포맷 설정
   * - 타임스탬프, 레벨, 메시지, 컨텍스트, requestId, 메타데이터 포함
   * @returns Winston 포맷 설정
   */
  private createFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, context, requestId, ...meta } = info;

        const logEntry = {
          timestamp,
          level,
          message,
          context,
          ...(requestId ? { requestId } : {}),
          ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
        };

        return JSON.stringify(logEntry);
      }),
    );
  }

  /**
   * 환경별 트랜스포트 설정
   * - 개발: 콘솔 출력 (컴러 + 심플 포맷)
   * - 운영: 콘솔 + 파일 로깅 (daily rotate)
   * @param isProd 운영환경 여부
   * @returns 트랜스포트 배열
   */
  private createTransports(isProd: boolean): winston.transport[] {
    const consoleFormat = isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ];

    // 운영환경에서만 파일 로깅 활성화 (일별 로테이션)
    if (isProd) {
      transports.push(
        // 일반 로그 파일 (14일 보관)
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.json(),
        }),
        // 에러 로그 전용 파일 (30일 보관)
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.json(),
        }),
      );
    }

    return transports;
  }

  /**
   * 컨텍스트와 메타데이터를 포함한 로깅
   * @param level 로그 레벨
   * @param message 로그 메시지
   * @param context 로그 컨텍스트 (기본: 'Application')
   * @param requestId 요청 추적 ID
   * @param meta 추가 메타데이터
   */
  private logWithContext(
    level: string,
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    const logData: LogMetadata = {
      context: context || LOGGER_CONSTANTS.CONTEXTS.APPLICATION,
      requestId,
      ...meta,
    };
    (this.logger as any)[level](message, logData);
  }

  /**
   * 일반 로그 메시지 출력 (Nest.js 호환성)
   * 내부적으로 info 레벨로 매핑됨
   *
   * @param message - 로그 메시지
   * @param context - 로그 컨텍스트 (기본값: 'Application')
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  log(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('info', message, context, requestId, meta);
  }

  /**
   * 오류 로그 메시지 출력
   * 애플리케이션 오류 및 예외 상황 기록
   *
   * @param message - 오류 메시지
   * @param trace - 스택 트레이스
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('error', message, context, requestId, {
      ...meta,
      stack: trace,
    });
  }

  /**
   * 경고 로그 메시지 출력
   * 잠재적 문제나 비정상적이지만 처리 가능한 상황 기록
   *
   * @param message - 경고 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  warn(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('warn', message, context, requestId, meta);
  }

  /**
   * 디버그 로그 메시지 출력
   * 개발 및 디버깅용 상세 정보 기록
   *
   * @param message - 디버그 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  debug(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('debug', message, context, requestId, meta);
  }

  /**
   * 상세 로그 메시지 출력 (Nest.js 호환성)
   * 내부적으로 Syslog notice 레벨로 매핑됨
   *
   * @param message - 상세 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  verbose(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    // Nest.js verbose를 Syslog notice에 매핑
    this.logWithContext('notice', message, context, requestId, meta);
  }

  // Syslog RFC 5424 표준 로그 레벨 메서드

  /**
   * 시스템 사용 불가 - 최고 심각도
   * 시스템 전체가 사용 불가한 상황에서 사용
   *
   * @param message - 시스템 사용 불가 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  emerg(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('emerg', message, context, requestId, meta);
  }

  /**
   * 즉각 조치 필요
   * 시스템 전체에 영향을 주는 중요한 문제 발생 시 사용
   *
   * @param message - 즉각 조치 필요 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  alert(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('alert', message, context, requestId, meta);
  }

  /**
   * 심각한 오류
   * 애플리케이션 주요 기능에 심각한 영향을 주는 오류
   *
   * @param message - 심각한 오류 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  crit(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('crit', message, context, requestId, meta);
  }

  /**
   * 주목할 정보
   * 일반적인 정보보다 중요하지만 경고 수준은 아닌 정보
   *
   * @param message - 주목할 정보 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  notice(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('notice', message, context, requestId, meta);
  }

  /**
   * 일반 정보
   * 애플리케이션 정상 동작에 대한 일반적인 정보
   *
   * @param message - 일반 정보 메시지
   * @param context - 로그 컨텍스트
   * @param requestId - 요청 추적 ID
   * @param meta - 추가 메타데이터
   */
  info(
    message: string,
    context?: string,
    requestId?: string,
    meta?: LogMetadata,
  ): void {
    this.logWithContext('info', message, context, requestId, meta);
  }

  /**
   * 성능 로깅 (느린 작업 감지)
   * @param operation 작업명
   * @param durationMs 실행 시간(밀리초)
   * @param requestId 요청 추적 ID
   * @param meta 추가 메타데이터
   */
  logPerformance(
    operation: string,
    durationMs: number,
    requestId?: string,
    meta?: Record<string, any>,
  ): void {
    // 1초 이상 걸리면 경고, 그 외는 정보 레벨
    const level = durationMs > 1000 ? 'warn' : 'info';
    this.logWithContext(
      level,
      LOGGER_CONSTANTS.MESSAGE_TEMPLATES.PERFORMANCE.SLOW_OPERATION(
        operation,
        durationMs,
      ),
      LOGGER_CONSTANTS.CONTEXTS.PERFORMANCE,
      requestId,
      {
        operation,
        duration: durationMs,
        ...meta,
      },
    );
  }

  /**
   * NestJS LoggerService 인터페이스 구현
   * 런타임에 로그 레벨 동적 조정
   * @param levels 설정할 로그 레벨 배열
   */
  setLogLevels?(levels: string[]): void {
    if (levels.length > 0) {
      const level = levels.includes('debug') ? 'debug' : 'info';
      this.logger.level = level;
    }
  }
}
