import { Test, TestingModule } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig } from '../../src/shared/module/app-config/app-config';
import { AppConfigModule } from '../../src/shared/module/app-config/app-config.module';
import { LoggerModule } from '../../src/shared/module/logger/logger.module';
import { createTestDatabaseConfig } from '../config/test-db.config';
import { TestContainerManager } from './testcontainer-singleton';

/**
 * NestJS 테스트 모듈 빌드를 위한 Fluent Builder
 *
 * @description
 * NestJS TestingModule 생성을 간소화하고 일관성 있는 테스트 환경을 제공합니다.
 * - Guard 모킹 (AuthGuard, WorkspaceMemberGuard 등)
 * - Testcontainer 기반 격리된 DB 환경
 * - CLS(Context Local Storage) 자동 설정
 * - MikroORM forRoot/forFeature 순서 자동 처리
 *
 * @example
 * ```typescript
 * // 기본 사용 (Docker Compose DB 사용)
 * const module = await TestModuleBuilder.create()
 *   .withModule(MeetingModule)
 *   .mockGuard(AuthGuard)
 *   .build();
 *
 * // Testcontainer 사용 (격리된 PostgreSQL 컨테이너)
 * const module = await TestModuleBuilder.create()
 *   .withModule(MeetingModule)
 *   .withTestcontainer('meeting-integration-test')
 *   .mockGuard(AuthGuard)
 *   .build();
 *
 * // E2E 테스트: 동적 workspaceMemberId 주입 패턴
 * let globalWorkspaceMemberId: string; // beforeEach에서 설정
 *
 * const mockWorkspaceMemberGuard = {
 *   canActivate: (context) => {
 *     const request = context.switchToHttp().getRequest();
 *     request.workspaceId = request.params?.workspaceId;
 *     request.workspaceMemberId = globalWorkspaceMemberId; // ✅ 동적 주입
 *     return true;
 *   }
 * };
 *
 * const module = await TestModuleBuilder.create()
 *   .withModule(MeetingModule)
 *   .mockGuard(AuthGuard, { id: 'user-123', uid: 'test-uid' })
 *   .mockGuard(WorkspaceMemberGuard, mockWorkspaceMemberGuard)
 *   .build();
 * ```
 */
export class TestModuleBuilder {
  private imports: any[] = [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => uuidv4(),
      },
    }),
    AppConfigModule,
    LoggerModule,
  ];
  private providers: any[] = [];
  private controllers: any[] = [];
  private guardOverrides: Array<{ guard: any; mock: any }> = [];
  private providerOverrides: Array<{ token: any; value: any }> = [];
  private useTestcontainer: boolean = false;
  private containerKey: string = 'default';

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
   *
   * @param guard - 재정의할 가드 클래스
   * @param mockOrUserPayload - (선택) 커스텀 mock 구현체 또는 request.user에 주입할 사용자 정보
   *
   * @example
   * ```typescript
   * // 단순 bypass
   * .mockGuard(AuthGuard)
   *
   * // request.user 주입
   * .mockGuard(AuthGuard, { id: 'user-123', uid: 'test-uid' })
   *
   * // 커스텀 mock 구현
   * .mockGuard(WorkspaceMemberGuard, {
   *   canActivate: (context) => {
   *     const request = context.switchToHttp().getRequest();
   *     request.workspaceMemberId = 'member-123';
   *     return true;
   *   }
   * })
   * ```
   */

  mockGuard(guard: any, mockOrUserPayload?: any): this {
    let mockImplementation;

    if (!mockOrUserPayload) {
      // 단순 bypass
      mockImplementation = { canActivate: () => true };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (typeof mockOrUserPayload.canActivate === 'function') {
      // 커스텀 mock 구현체
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockImplementation = mockOrUserPayload;
    } else {
      // request.user 주입 패턴
      mockImplementation = {
        canActivate: (context: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const request = context.switchToHttp().getRequest();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          request.user = mockOrUserPayload; // ✅ request.user 주입
          return true;
        },
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.guardOverrides.push({ guard, mock: mockImplementation });
    return this;
  }

  /**
   * Provider 재정의 (Mock 주입용)
   *
   * @description
   * 특정 Provider를 Mock으로 교체합니다.
   * Bull Queue, 외부 서비스 등을 Mock할 때 사용합니다.
   *
   * @param token - Provider 토큰 (클래스 또는 Injection Token)
   * @param value - Mock 객체
   *
   * @example
   * ```typescript
   * import { getQueueToken } from '@nestjs/bull';
   *
   * const mockQueue = {
   *   add: jest.fn().mockResolvedValue({}),
   * };
   *
   * const module = await TestModuleBuilder.create()
   *   .withModule(MailModule)
   *   .overrideProvider(getQueueToken('mail'))
   *   .useValue(mockQueue)
   *   .build();
   * ```
   */
  overrideProvider(token: any): { useValue: (value: any) => TestModuleBuilder } {
    return {
      useValue: (value: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.providerOverrides.push({ token, value });
        return this;
      },
    };
  }

  /**
   * Testcontainer 사용 설정 (격리된 PostgreSQL 컨테이너)
   *
   * @description
   * 각 테스트 스위트가 독립적인 PostgreSQL 컨테이너를 사용하도록 설정합니다.
   * 동일한 key를 사용하면 컨테이너를 재사용하여 시작 시간을 단축합니다.
   *
   * @param key - 컨테이너 식별자 (기본값: 'default')
   *              동일한 key를 사용하면 컨테이너 재사용, 다른 key는 별도 컨테이너 생성
   *
   * @example
   * ```typescript
   * // 도메인별 격리된 컨테이너
   * const module = await TestModuleBuilder.create()
   *   .withModule(MeetingModule)
   *   .withTestcontainer('meeting-service-integration') // ✅ Meeting 전용 컨테이너
   *   .build();
   *
   * // 같은 key로 컨테이너 재사용
   * const module2 = await TestModuleBuilder.create()
   *   .withModule(WorkspaceModule)
   *   .withTestcontainer('meeting-service-integration') // ✅ 동일 컨테이너 재사용
   *   .build();
   * ```
   *
   * @remarks
   * - Testcontainer를 사용하지 않으면 Docker Compose의 공유 DB를 사용합니다
   * - Integration 테스트에서 완전한 격리가 필요한 경우 사용 권장
   * - E2E 테스트에서는 일반적으로 불필요 (공유 DB로 충분)
   */
  withTestcontainer(key: string = 'default'): this {
    this.useTestcontainer = true;
    this.containerKey = key;
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
          return config;
        },
        inject: [AppConfig],
      });
    } else {
      // 기존 Docker Compose 방식
      mikroOrmConfig = MikroOrmModule.forRootAsync({
        imports: [AppConfigModule],
        useFactory: (appConfig: AppConfig) =>
          createTestDatabaseConfig(appConfig),
        inject: [AppConfig],
      });
    }

    let testingModuleBuilder = Test.createTestingModule({
      imports: [
        mikroOrmConfig, // ✅ MikroORM forRoot를 먼저 로드
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ...this.imports, // ✅ Feature modules는 나중에 (forFeature 포함)
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

    // Apply provider overrides
    for (const override of this.providerOverrides) {
      testingModuleBuilder = testingModuleBuilder
        .overrideProvider(override.token)
        .useValue(override.value);
    }

    const module = await testingModuleBuilder.compile();

    return module;
  }
}
