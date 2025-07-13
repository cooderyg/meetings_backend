import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggingMiddleware } from './logging.middleware';

@Global()
@Module({
  providers: [LoggerService, LoggingInterceptor, LoggingMiddleware],
  exports: [LoggerService, LoggingInterceptor, LoggingMiddleware],
})
export class LoggerModule {}
