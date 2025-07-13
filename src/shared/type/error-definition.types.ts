export interface ErrorDefinition {
  message: string;
  userMessage: string;
  httpStatus: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
}
