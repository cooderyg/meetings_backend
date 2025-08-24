export interface ErrorResponse {
  code: string;
  message?: string;
  context?: Record<string, any>;
  details?: any; // Legacy 지원
}
