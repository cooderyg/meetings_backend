export interface ErrorResponseBase {
  code: string;
  message: string;
  userMessage: string;
}

export interface ErrorResponseWithDetails extends ErrorResponseBase {
  details?: any;
}

export interface ErrorResponseWithDebug extends ErrorResponseWithDetails {
  debug?: {
    errorCode?: string;
    internalMessage?: string;
    originalResponse?: any;
    originalError?: any;
    type?: string;
    stack?: string;
    timestamp: string;
  };
}

export type ErrorResponse = ErrorResponseWithDebug;
