export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message?: string; // AppError는 클라이언트 i18n을 위해 메시지 선택적
    details?: any;
  };
  totalCount?: number;
}
