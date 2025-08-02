export const LOGGER_CONSTANTS = {
  PERFORMANCE_THRESHOLD: {
    HTTP_REQUEST_SLOW: 1000,
    CONTROLLER_SLOW: 500,
  },
  LOG_LEVELS: {
    PRODUCTION: 'info',
    DEVELOPMENT: 'debug',
    // Syslog RFC 5424 레벨 정의
    SYSLOG: {
      EMERG: 'emerg', // 0: 시스템 사용 불가
      ALERT: 'alert', // 1: 즉각 조치 필요
      CRIT: 'crit', // 2: 심각한 오류
      ERROR: 'error', // 3: 오류
      WARN: 'warn', // 4: 경고
      NOTICE: 'notice', // 5: 주목할 정보
      INFO: 'info', // 6: 일반 정보
      DEBUG: 'debug', // 7: 디버그 정보
    },
  },
  CONTEXTS: {
    APPLICATION: 'Application',
    HTTP: 'HTTP',
    CONTROLLER: 'Controller',
    PERFORMANCE: 'Performance',
  },
  HEALTH_CHECK_PATHS: ['/', '/health'] as const,
  HEALTH_CHECK_USER_AGENTS: ['ELB-HealthChecker', 'kube-probe'],
  MESSAGE_TEMPLATES: {
    HTTP: {
      STARTED: (method: string, url: string) => `${method} ${url} started`,
      COMPLETED: (
        method: string,
        url: string,
        status: number,
        duration: number
      ) => `${method} ${url} completed - ${status} - ${duration}ms`,
      FAILED: (method: string, url: string, status: number, duration: number) =>
        `${method} ${url} failed - ${status} - ${duration}ms`,
    },
    CONTROLLER: {
      STARTED: (controllerPath: string) => `${controllerPath} started`,
      COMPLETED: (controllerPath: string, status: number, duration: number) =>
        `${controllerPath} completed - ${status} - ${duration}ms`,
      FAILED: (controllerPath: string, error: string) =>
        `${controllerPath} failed: ${error}`,
    },
    PERFORMANCE: {
      SLOW_OPERATION: (operation: string, duration: number) =>
        `${operation} completed in ${duration}ms`,
    },
  },
} as const;
