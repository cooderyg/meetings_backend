export interface ErrorResponse {
  code: string;
  message?: string; // AppError는 클라이언트 i18n을 위해 메시지 제외, 다른 에러는 포함
  context?: Record<string, any>;
  details?: any; // Legacy 지원
}
