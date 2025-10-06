# 테스트 전략 가이드

## 📋 목차

1. [프로젝트 테스트 현황](#프로젝트-테스트-현황)
2. [3계층 아키텍처 테스트 전략](#3계층-아키텍처-테스트-전략)
3. [테스트 유형별 분석](#테스트-유형별-분석)
4. [테스트 인프라 분석](#테스트-인프라-분석)
5. [개선 권장사항](#개선-권장사항)
6. [실무 가이드라인](#실무-가이드라인)

---

## 프로젝트 테스트 현황

### 🎯 전체 평가: 8.5/10 ⭐⭐⭐⭐⭐

현재 프로젝트는 **매우 잘 구성된 테스트 환경**을 가지고 있습니다. 특히 Testcontainer를 활용한 격리성과 테스트 유틸리티의 품질이 뛰어납니다.

### 📊 테스트 구조

```
src/
├── domain/
│   ├── user/
│   │   ├── user.service.spec.ts          # Unit Test (Mock)
│   │   ├── user.repository.spec.ts       # Unit Test (Mock)
│   │   └── user.repository.integration.spec.ts  # Integration Test (실제 DB)
│   └── meeting/
│       ├── meeting.service.spec.ts       # Integration Test
│       └── meeting.repository.spec.ts    # Integration Test
└── test/
    ├── e2e/
    │   └── meeting.e2e-spec.ts           # E2E Test
    └── utils/
        ├── test-module.builder.ts        # 테스트 모듈 빌더
        ├── testcontainer-singleton.ts    # Testcontainer 관리
        └── db-helpers.ts                 # DB 헬퍼 함수
```

---

## 3계층 아키텍처 테스트 전략

### 🏗️ 테스트 피라미드

```
        E2E Tests (적음)
       ┌─────────────────┐
      │   Controller     │  ← HTTP 인터페이스 테스트
     ┌─────────────────────┐
    │     Service          │  ← 비즈니스 로직 테스트
   ┌─────────────────────────┐
  │      Repository          │  ← 데이터 접근 테스트
 └─────────────────────────────┘
```

### 📋 각 계층별 테스트 전략

| 계층           | 역할            | 테스트 방식           | 비율  | 핵심 포인트                          |
| -------------- | --------------- | --------------------- | ----- | ------------------------------------ |
| **Controller** | HTTP 인터페이스 | Unit Test (Mock)      | 70%   | HTTP 상태 코드, 입력 검증, 인증/인가 |
| **Service**    | 비즈니스 로직   | Unit + Integration    | 50:50 | 비즈니스 규칙, 트랜잭션, 도메인 로직 |
| **Repository** | 데이터 접근     | Integration (실제 DB) | 70%   | 쿼리 정확성, 데이터 무결성, 성능     |

---

## 테스트 유형별 분석

### 1. Unit Tests (Mock 기반)

**특징**: 빠른 실행, 외부 의존성 없음, 순수한 로직 테스트

```typescript
// user.service.spec.ts 예시
describe('UserService', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateUser: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  it('should create user with business rules', async () => {
    // Given-When-Then 패턴으로 테스트
  });
});
```

**장점**:

- ✅ 빠른 실행 속도
- ✅ 외부 의존성 없음
- ✅ 순수한 비즈니스 로직 테스트

**단점**:

- ❌ 실제 데이터베이스 동작과 차이 가능성
- ❌ 통합 이슈 발견 어려움

### 2. Integration Tests (실제 DB)

**특징**: 실제 데이터베이스와 연동, Testcontainer 활용

```typescript
// user.repository.integration.spec.ts 예시
describe('UserRepository Integration Tests', () => {
  beforeAll(async () => {
    module = await TestModuleBuilder.create()
      .withModule(UserModule)
      .withTestcontainer('user-integration-test')
      .build();
  });

  it('should find user by email with case sensitivity', async () => {
    // 실제 DB에서 데이터 생성 및 조회 테스트
  });
});
```

**장점**:

- ✅ 실제 환경과 동일한 조건
- ✅ 데이터 무결성 검증 가능
- ✅ 복잡한 쿼리 및 트랜잭션 테스트

**단점**:

- ❌ 실행 속도가 상대적으로 느림
- ❌ 테스트 환경 설정 복잡

### 3. E2E Tests (전체 플로우)

**특징**: HTTP 요청부터 응답까지 전체 플로우 테스트

```typescript
// meeting.e2e-spec.ts 예시
describe('Meeting E2E', () => {
  it('should complete full meeting lifecycle', async () => {
    // 1. Create meeting
    // 2. Update meeting
    // 3. Publish meeting
    // 4. Delete meeting
  });
});
```

**장점**:

- ✅ 실제 사용자 시나리오 검증
- ✅ 전체 시스템 통합 테스트
- ✅ API 계약 검증

**단점**:

- ❌ 실행 속도가 가장 느림
- ❌ 디버깅이 어려움
- ❌ 유지보수 비용 높음

---

## 테스트 인프라 분석

### 🛠️ 핵심 유틸리티

#### 1. TestModuleBuilder

```typescript
// 빌더 패턴으로 테스트 모듈 구성
const module = await TestModuleBuilder.create()
  .withModule(UserModule)
  .withTestcontainer('test-key')
  .mockGuard(AuthGuard)
  .build();
```

**특징**:

- ✅ 빌더 패턴으로 직관적인 구성
- ✅ 가드 모킹, 엔티티 등록 지원
- ✅ Testcontainer 자동 설정

#### 2. TestContainerManager

```typescript
// 싱글톤으로 컨테이너 관리
const manager = TestContainerManager.getInstance();
const container = await manager.getPostgresContainer('test-key');
```

**특징**:

- ✅ 싱글톤 패턴으로 컨테이너 재사용
- ✅ 워커별 격리로 병렬 테스트 안정성
- ✅ 메모리 DB 사용으로 성능 향상

#### 3. DB Helpers

```typescript
// 트랜잭션 기반 격리
beforeEach(async () => {
  await startTransaction(em);
});

afterEach(async () => {
  await rollbackTransaction(em);
});
```

**특징**:

- ✅ 트랜잭션 기반 격리로 테스트 간 데이터 정리
- ✅ 워커별 스키마 생성/삭제
- ✅ 헬퍼 함수로 반복 코드 제거

---

## 개선 권장사항

### 🎯 우선순위별 개선사항

#### 1. 높은 우선순위

- [ ] **Controller Unit Test 추가**: 현재 E2E만 있음
- [ ] **테스트 커버리지 확장**: Auth, Workspace, Permission 도메인
- [ ] **테스트 문서화**: 가이드라인 및 실행 방법

#### 2. 중간 우선순위

- [ ] **Factory 패턴 도입**: 테스트 데이터 생성 표준화
- [ ] **성능 테스트 추가**: 대용량 데이터 처리 테스트
- [ ] **테스트 실행 최적화**: 병렬 실행 및 캐싱

#### 3. 낮은 우선순위

- [ ] **테스트 메트릭 수집**: 실행 시간 및 커버리지 모니터링
- [ ] **자동화 개선**: CI/CD 파이프라인 최적화

### 📝 구체적 개선 예시

#### Factory 패턴 도입

```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: uuid(),
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      isDeleted: false,
      settings: { theme: { mode: 'system' } },
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

#### Controller Unit Test 추가

```typescript
// user.controller.spec.ts
describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('GET /users/:id', () => {
    it('should return user when found', async () => {
      // Given
      const mockUser = UserFactory.create();
      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      // When
      const result = await controller.getUser(mockUser.id);

      // Then
      expect(result).toEqual(mockUser);
      expect(userService.getUserById).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
```

---

## 실무 가이드라인

### 🚀 테스트 실행 전략

```json
// package.json
{
  "scripts": {
    "test:unit": "jest --testPathPattern=\\.spec\\.ts$",
    "test:integration": "jest --testPathPattern=\\.integration\\.spec\\.ts$",
    "test:e2e": "jest --testPathPattern=\\.e2e-spec\\.ts$",
    "test:fast": "pnpm run test:unit",
    "test:all": "pnpm run test:unit && pnpm run test:integration && pnpm run test:e2e",
    "test:watch": "jest --watch --testPathPattern=\\.spec\\.ts$"
  }
}
```

### 📋 개발 워크플로우

1. **개발 중**: `pnpm run test:fast` - Unit Test로 빠른 피드백
2. **커밋 전**: `pnpm run test:integration` - Integration Test로 DB 동작 검증
3. **배포 전**: `pnpm run test:all` - 전체 테스트 실행

### 🎯 테스트 작성 원칙

#### 1. Given-When-Then 패턴

```typescript
it('should create user with valid data', async () => {
  // Given - 테스트 데이터 준비
  const userData = { email: 'test@example.com', firstName: 'John' };

  // When - 테스트 실행
  const result = await service.createUser(userData);

  // Then - 결과 검증
  expect(result).toBeDefined();
  expect(result.email).toBe(userData.email);
});
```

#### 2. 한국어 테스트명

```typescript
it('이메일로 사용자를 찾아야 함', async () => {
  // 테스트 내용
});
```

#### 3. 에러 케이스 포함

```typescript
it('존재하지 않는 이메일로 조회 시 null을 반환해야 함', async () => {
  // Given
  const nonExistentEmail = 'notfound@example.com';

  // When
  const foundUser = await repository.findByEmail(nonExistentEmail);

  // Then
  expect(foundUser).toBeNull();
});
```

### 🔧 디버깅 가이드

#### 테스트 실패 시 체크리스트

1. **데이터 정리**: `beforeEach`/`afterEach`에서 데이터 초기화 확인
2. **트랜잭션**: 롤백이 제대로 되었는지 확인
3. **격리성**: 다른 테스트와 데이터 충돌 여부 확인
4. **타이밍**: 비동기 작업 완료 대기 시간 확인

#### 로그 확인

```bash
# 테스트 DB 로그 확인
pnpm run test:db:logs

# 특정 테스트만 실행
pnpm run test:unit -- --testNamePattern="should create user"
```

---

## 📊 결론

현재 프로젝트는 **엔터프라이즈급 테스트 환경**을 구축하고 있습니다. 제안한 개선사항들을 단계적으로 적용하면 더욱 견고하고 유지보수하기 쉬운 테스트 환경이 될 것입니다.

### 핵심 성공 요소

- ✅ **Testcontainer**를 활용한 완벽한 격리성
- ✅ **3계층 아키텍처**에 맞는 테스트 전략
- ✅ **뛰어난 테스트 유틸리티** (TestModuleBuilder, TestContainerManager)
- ✅ **체계적인 테스트 구조** (Unit, Integration, E2E)

### 다음 단계

1. Controller Unit Test 추가
2. 테스트 커버리지 확장
3. Factory 패턴 도입
4. 성능 테스트 추가

---

_이 문서는 프로젝트의 테스트 전략을 종합적으로 분석한 결과입니다. 추가 질문이나 특정 영역에 대한 더 자세한 설명이 필요하시면 언제든 문의해 주세요._
