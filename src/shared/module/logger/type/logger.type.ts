export {};

export interface LogMetadata {
  context?: string;
  requestId?: string;
  [key: string]: any;
}

export interface ExceptionLogMetadata extends LogMetadata {
  status?: number;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  code?: string;
  details?: any;
  errorCode?: string;
}
