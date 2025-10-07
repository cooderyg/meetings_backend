import { Test, TestingModule } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ExecutionContext } from '@nestjs/common';
import { AppConfig } from '../../src/shared/module/app-config/app-config';
import { AppConfigModule } from '../../src/shared/module/app-config/app-config.module';
import { createTestDatabaseConfig } from '../config/test-db.config';
import { TestContainerManager } from './testcontainer-singleton';
import { AccessTokenPayload } from '../../src/shared/type/token.type';
import { QueryCounter } from './query-counter';

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
  private useTestcontainer: boolean = false;
  private containerKey: string = 'default';
  private queryCounter?: QueryCounter;

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
   * @param guard - 모킹할 Guard 클래스
   * @param mockUser - (선택) Mock user 객체. 제공 시 request.user에 주입
   *
   * @example
   * // 단순 bypass
   * .mockGuard(AuthGuard)
   *
   * // User context 주입
   * .mockGuard(AuthGuard, { uid: 'test-uid', id: 'test-id' })
   */
  mockGuard(guard: any, mockUser?: AccessTokenPayload): this {
    const mock = mockUser
      ? {
          canActivate: (context: ExecutionContext) => {
            const request = context.switchToHttp().getRequest();
            request.user = mockUser;
            return true;
          },
        }
      : { canActivate: () => true };

    this.guardOverrides.push({ guard, mock });
    return this;
  }

  /**
   * Testcontainer 사용 설정
   */
  withTestcontainer(key: string = 'default'): this {
    this.useTestcontainer = true;
    this.containerKey = key;
    return this;
  }

  /**
   * Query Counter 설정 (N+1 쿼리 감지용)
   * @param counter - QueryCounter 인스턴스
   *
   * @example
   * const queryCounter = new QueryCounter();
   * const module = await TestModuleBuilder.create()
   *   .withModule(MeetingModule)
   *   .withQueryCounter(queryCounter)
   *   .build();
   *
   * // In test
   * queryCounter.reset();
   * await repository.findAll({ populate: ['author'] });
   * expect(queryCounter.getCount()).toBe(1);
   */
  withQueryCounter(counter: QueryCounter): this {
    this.queryCounter = counter;
    return this;
  }

  /**
   * TestingModule 빌드
   */
  async build(): Promise<TestingModule> {
    // Testcontainer를 사용하는 경우 동적 연결 설정
    let mikroOrmConfig;
    if (this.useTestcontainer) {
      const manager = TestContainerManager.getInstance();
      const container = await manager.getPostgresContainer(this.containerKey);

      mikroOrmConfig = MikroOrmModule.forRootAsync({
        imports: [AppConfigModule],
        useFactory: (appConfig: AppConfig) => {
          const config = createTestDatabaseConfig(appConfig);
          // Testcontainer 연결 정보로 오버라이드
          config.clientUrl = container.getConnectionUri();
          // 개별 연결 정보 제거 (clientUrl 우선 사용)
          delete config.host;
          delete config.port;
          delete config.user;
          delete config.password;
          delete config.dbName;
          // 스키마 설정 제거 (Testcontainer는 기본 public 스키마 사용)
          delete config.schema;

          // Query Counter 설정
          if (this.queryCounter) {
            config.logger = this.queryCounter.logQuery;
            config.debug = true;
          }

          return config;
        },
        inject: [AppConfig],
      });
    } else {
      // 기존 Docker Compose 방식
      mikroOrmConfig = MikroOrmModule.forRootAsync({
        imports: [AppConfigModule],
        useFactory: (appConfig: AppConfig) => {
          const config = createTestDatabaseConfig(appConfig);

          // Query Counter 설정
          if (this.queryCounter) {
            config.logger = this.queryCounter.logQuery;
            config.debug = true;
          }

          return config;
        },
        inject: [AppConfig],
      });
    }

    let testingModuleBuilder = Test.createTestingModule({
      imports: [
        ...this.imports,
        mikroOrmConfig,
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
