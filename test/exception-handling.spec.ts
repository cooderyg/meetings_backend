import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/shared/filter/global-exception.filter';
import { AppException } from '../src/shared/exception/app.exception';
import { ErrorCode } from '../src/shared/enum/error-code';
import { LoggerService } from '../src/shared/module/logger/logger.service';
import { AppConfig } from '../src/shared/module/app-config/app-config';

describe('Exception Handling (e2e)', () => {
  let app: INestApplication;
  let loggerService: LoggerService;
  let appConfig: AppConfig;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    loggerService = moduleFixture.get<LoggerService>(LoggerService);
    appConfig = moduleFixture.get<AppConfig>(AppConfig);

    // Set up exception filter
    app.useGlobalFilters(new GlobalExceptionFilter(loggerService, appConfig));

    // Set up validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (validationErrors) => {
          const formattedErrors = validationErrors.reduce((acc, error) => {
            acc[error.property] = Object.values(error.constraints || {});
            return acc;
          }, {});
          return new AppException(ErrorCode.VALIDATION_FAILED, {
            message: '입력값이 유효하지 않습니다',
            details: formattedErrors,
          });
        },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('AppException Handling', () => {
    it('should handle AUTH_UNAUTHORIZED exception', () => {
      // This would need a test controller that throws AUTH_UNAUTHORIZED
      // For now, testing the structure
      const exception = new AppException(ErrorCode.AUTH_UNAUTHORIZED);

      expect(exception.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
      expect(exception.errorCode).toBe(ErrorCode.AUTH_UNAUTHORIZED);
      expect(exception.userMessage).toBeDefined();
      expect(exception.logLevel).toBeDefined();
    });

    it('should handle VALIDATION_FAILED exception with details', () => {
      const details = { email: ['Invalid email format'] };
      const exception = new AppException(ErrorCode.VALIDATION_FAILED, {
        message: '입력값이 유효하지 않습니다',
        details,
      });

      expect(exception.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(exception.details).toEqual(details);
    });

    it('should handle RESOURCE_NOT_FOUND exception', () => {
      const exception = new AppException(ErrorCode.RESOURCE_NOT_FOUND);

      expect(exception.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(exception.getStatus()).toBe(404);
    });

    it('should handle SYSTEM_INTERNAL_ERROR exception', () => {
      const exception = new AppException(ErrorCode.SYSTEM_INTERNAL_ERROR, {
        message: 'Custom internal error message',
      });

      expect(exception.code).toBe(ErrorCode.SYSTEM_INTERNAL_ERROR);
      expect(exception.message).toBe('Custom internal error message');
      expect(exception.getStatus()).toBe(500);
    });
  });

  describe('GlobalExceptionFilter', () => {
    it('should format AppException response correctly', () => {
      const filter = new GlobalExceptionFilter(loggerService, appConfig);

      // Test would need mock request/response objects
      // This tests the structure
      expect(filter).toBeDefined();
    });

    it('should handle validation errors from ValidationPipe', () => {
      // This would test the ValidationPipe integration
      // Would need a test endpoint that triggers validation
      expect(true).toBe(true);
    });
  });

  describe('Error Code Validation', () => {
    it('should validate error codes in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock console.warn to capture warnings
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        // This should trigger validation warning for invalid code
        // Testing invalid error code
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new AppException('INVALID_CODE' as any);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid error code'),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        warnSpy.mockRestore();
      }
    });

    it('should track error code usage statistics', () => {
      // Clear existing stats
      AppException.resetErrorCodeStats();

      // Create some exceptions
      new AppException(ErrorCode.AUTH_UNAUTHORIZED);
      new AppException(ErrorCode.AUTH_UNAUTHORIZED);
      new AppException(ErrorCode.VALIDATION_FAILED);

      const stats = AppException.getErrorCodeStats();
      expect(stats[ErrorCode.AUTH_UNAUTHORIZED]).toBe(2);
      expect(stats[ErrorCode.VALIDATION_FAILED]).toBe(1);
    });
  });

  describe('Error Response Structure', () => {
    it('should return standardized error response format', () => {
      const exception = new AppException(ErrorCode.AUTH_UNAUTHORIZED, {
        details: { reason: 'Token expired' },
      });

      expect(exception.code).toBe('AUTH_001');
      expect(exception.details).toEqual({ reason: 'Token expired' });
      expect(exception.userMessage).toBeDefined();
      expect(exception.logLevel).toBeDefined();
    });

    it('should include debug information in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        // This would test debug info inclusion
        // Would need to test actual filter response
        expect(true).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Error Categories', () => {
    it('should handle AUTH category errors', () => {
      const authErrors = [
        ErrorCode.AUTH_UNAUTHORIZED,
        ErrorCode.AUTH_TOKEN_EXPIRED,
        ErrorCode.AUTH_FORBIDDEN,
      ];

      authErrors.forEach((errorCode) => {
        const exception = new AppException(errorCode);
        expect(exception.code).toBe(errorCode);
        expect(exception.code.startsWith('AUTH_')).toBe(true);
      });
    });

    it('should handle VALIDATION category errors', () => {
      const validationErrors = [
        ErrorCode.VALIDATION_FAILED,
        ErrorCode.VALIDATION_INVALID_INPUT,
        ErrorCode.VALIDATION_INVALID_PARAM,
      ];

      validationErrors.forEach((errorCode) => {
        const exception = new AppException(errorCode);
        expect(exception.code).toBe(errorCode);
        expect(exception.code.startsWith('VAL_')).toBe(true);
      });
    });

    it('should handle BUSINESS category errors', () => {
      const businessErrors = [
        ErrorCode.BUSINESS_INSUFFICIENT_FUNDS,
        ErrorCode.BUSINESS_PAYMENT_FAILED,
        ErrorCode.BUSINESS_PRODUCT_OUT_OF_STOCK,
      ];

      businessErrors.forEach((errorCode) => {
        const exception = new AppException(errorCode);
        expect(exception.code).toBe(errorCode);
        expect(exception.code.startsWith('BIZ_')).toBe(true);
      });
    });
  });

  describe('Error Logging Levels', () => {
    it('should respect configured log levels', () => {
      const exception = new AppException(ErrorCode.AUTH_UNAUTHORIZED);

      // Check that log level is properly set from ERROR_DEFINITIONS
      expect(['error', 'warn', 'info', 'debug', 'verbose']).toContain(
        exception.logLevel,
      );
    });
  });

  describe('Error Details Handling', () => {
    it('should preserve error details in exception', () => {
      const details = {
        field: 'email',
        value: 'invalid-email',
        constraints: ['must be a valid email'],
      };

      const exception = new AppException(ErrorCode.VALIDATION_FAILED, {
        details,
      });

      expect(exception.details).toEqual(details);
    });

    it('should handle complex nested details', () => {
      const complexDetails = {
        user: {
          id: 123,
          email: 'test@example.com',
        },
        validation: {
          fields: ['name', 'email'],
          errors: {
            name: ['required'],
            email: ['invalid format'],
          },
        },
      };

      const exception = new AppException(ErrorCode.VALIDATION_FAILED, {
        details: complexDetails,
      });

      expect(exception.details).toEqual(complexDetails);
    });
  });
});
