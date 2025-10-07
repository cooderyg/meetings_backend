import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../../src/shared/filter/global-exception.filter';
import { LoggerService } from '../../src/shared/module/logger/logger.service';
import { AppError } from '../../src/shared/exception/app.error';

/**
 * E2E 테스트용 Global Enhancers 설정 헬퍼
 *
 * @description
 * NestJS E2E 테스트 환경에서 main.ts와 동일한 전역 설정을 적용합니다.
 * - ValidationPipe: DTO 검증 및 변환
 * - GlobalExceptionFilter: AppError → HTTP 응답 변환
 *
 * @param app - NestJS 애플리케이션 인스턴스
 * @param moduleFixture - 컴파일된 TestingModule (LoggerService 주입용)
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   const moduleFixture = await TestModuleBuilder.create()
 *     .withModule(WorkspaceModule)
 *     .build();
 *
 *   app = moduleFixture.createNestApplication();
 *   setupE2EEnhancers(app, moduleFixture);  // ✅ 전역 설정 적용
 *   await app.init();
 * });
 * ```
 */
export function setupE2EEnhancers(
  app: INestApplication,
  moduleFixture: TestingModule
): void {
  // LoggerService 주입
  const loggerService = moduleFixture.get(LoggerService);

  // Global Exception Filter 설정
  app.useGlobalFilters(new GlobalExceptionFilter(loggerService));

  // Validation Pipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (validationErrors) => {
        const formattedErrors = validationErrors.reduce((acc, error) => {
          acc[error.property] = Object.values(error.constraints || {});
          return acc;
        }, {});
        return new AppError('validation.form.failed', {
          fields: formattedErrors,
        });
      },
    })
  );
}
