import { Test, TestingModule } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppConfig } from '../../src/shared/module/app-config/app-config';
import { AppConfigModule } from '../../src/shared/module/app-config/app-config.module';
import { createTestDatabaseConfig } from '../config/test-db.config';

/**
 * 테스트용 NestJS 모듈 빌더
 *
 * @example
 * const module = await TestModuleBuilder.create()
 *   .withModule(MeetingModule)
 *   .build();
 */
export class TestModuleBuilder {
  private imports: any[] = [AppConfigModule];
  private providers: any[] = [];
  private controllers: any[] = [];
  private guardOverrides: Array<{ guard: any; mock: any }> = [];

  static create(): TestModuleBuilder {
    return new TestModuleBuilder();
  }

  /**
   * 도메인 모듈 추가
   */
  withModule(module: any): this {
    this.imports.push(module);
    return this;
  }

  /**
   * 커스텀 프로바이더 추가
   */
  withProvider(provider: any): this {
    this.providers.push(provider);
    return this;
  }

  /**
   * 컨트롤러 추가 (E2E 테스트용)
   */
  withController(controller: any): this {
    this.controllers.push(controller);
    return this;
  }

  /**
   * 엔티티 등록 (Repository 테스트용)
   */
  withEntity(entity: any): this {
    this.imports.push(MikroOrmModule.forFeature([entity]));
    return this;
  }

  /**
   * 가드 모킹 (E2E 테스트용)
   */
  mockGuard(guard: any, mock: any = { canActivate: () => true }): this {
    this.guardOverrides.push({ guard, mock });
    return this;
  }

  /**
   * TestingModule 빌드
   */
  async build(): Promise<TestingModule> {
    let testingModuleBuilder = Test.createTestingModule({
      imports: [
        ...this.imports,
        MikroOrmModule.forRootAsync({
          imports: [AppConfigModule],
          useFactory: (appConfig: AppConfig) =>
            createTestDatabaseConfig(appConfig),
          inject: [AppConfig],
        }),
      ],
      providers: this.providers,
      controllers: this.controllers,
    });

    // Apply guard overrides
    for (const override of this.guardOverrides) {
      testingModuleBuilder = testingModuleBuilder
        .overrideGuard(override.guard)
        .useValue(override.mock);
    }

    const module = await testingModuleBuilder.compile();

    return module;
  }
}
