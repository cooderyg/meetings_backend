import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './shared/module/logger/logging.interceptor';
import { LoggerService } from './shared/module/logger/logger.service';
import { TransformInterceptor } from './shared/interceptor/transform.interceptor';
import { MikroORM } from '@mikro-orm/core';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './shared/filter/global-exception.filter';
import { AppConfig } from './shared/module/app-config/app-config';
import { SwaggerModule } from '@nestjs/swagger';
import {
  createDocumentBuilder,
  swaggerCustomOptions,
} from './config/swagger-config';
import { AppException } from './shared/exception/app.exception';
import { ERROR_CODES } from './shared/const/error-code.const';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const orm = app.get(MikroORM);
  const generator = orm.getSchemaGenerator();
  // 개발 환경에서만 실행
  if (process.env.NODE_ENV === 'development') {
    await generator.updateSchema({ dropTables: false });
  }

  const loggerService = app.get(LoggerService);
  const appConfig = app.get(AppConfig);

  app.useGlobalFilters(new GlobalExceptionFilter(loggerService, appConfig));

  // 유효성 검증 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (validationErrors) => {
        // 검증 오류를 필드별로 정리
        const formattedErrors = validationErrors.reduce((acc, error) => {
          acc[error.property] = Object.values(error.constraints || {});
          return acc;
        }, {});
        // AppException으로 변환 (세부 오류 정보 포함)
        return new AppException(ERROR_CODES.VALIDATION_FAILED, {
          message: '입력값이 유효하지 않습니다',
          details: formattedErrors,
        });
      },
    }),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(loggerService),
    new TransformInterceptor(),
  );

  const document = SwaggerModule.createDocument(
    app,
    createDocumentBuilder({
      apiVersion: appConfig.apiVersion,
      appName: appConfig.appName,
    }),
  );

  SwaggerModule.setup('api-docs', app, document, swaggerCustomOptions);

  await app.listen(process.env.PORT || 3000);

  // 애플리케이션 종료 시 리소스 정리
  process.on('SIGTERM', () => {
    void app.close();
  });
}
void bootstrap();
