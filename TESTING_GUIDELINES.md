# 테스트 가이드라인

## 📋 목차

1. [테스트 실행 방법](#테스트-실행-방법)
2. [테스트 작성 규칙](#테스트-작성-규칙)
3. [Factory 패턴 사용법](#factory-패턴-사용법)
4. [테스트 디버깅](#테스트-디버깅)
5. [CI/CD 통합](#cicd-통합)

---

## 테스트 실행 방법

### 🚀 기본 명령어

```bash
# 전체 테스트 실행
pnpm run test:all

# 빠른 테스트 (Unit Test만)
pnpm run test:fast

# Unit Test만 실행
pnpm run test:unit

# Integration Test만 실행
pnpm run test:integration

# E2E Test만 실행
pnpm run test:e2e
```

### 🔄 개발 중 테스트

```bash
# Unit Test 감시 모드 (개발 중 권장)
pnpm run test:unit:watch

# Integration Test 감시 모드
pnpm run test:integration:watch

# 특정 도메인 테스트
pnpm run test:user
pnpm run test:meeting
pnpm run test:workspace
```

### 📊 커버리지 확인

```bash
# 커버리지 리포트 생성
pnpm run test:cov

# 커버리지 리포트는 coverage/ 폴더에 생성됩니다
```

### 🐳 데이터베이스 관리

```bash
# 테스트 DB 시작
pnpm run test:db:up

# 테스트 DB 중지
pnpm run test:db:down

# 테스트 DB 로그 확인
pnpm run test:db:logs
```

---

## 테스트 작성 규칙

### 📝 기본 원칙

#### 1. Given-When-Then 패턴

```typescript
it('사용자를 생성해야 함', async () => {
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
// ✅ 좋은 예
it('이메일로 사용자를 찾아야 함', async () => {
  // 테스트 내용
});

// ❌ 나쁜 예
it('should find user by email', async () => {
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

### 🏗️ 계층별 테스트 전략

#### Controller 계층

- **목적**: HTTP 인터페이스 검증
- **방식**: Unit Test (Mock)
- **포인트**: 상태 코드, 입력 검증, 에러 처리

```typescript
describe('UserController', () => {
  it('사용자 조회 시 200 상태 코드를 반환해야 함', async () => {
    // Given
    const mockUser = UserFactory.create();
    (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

    // When
    const result = await controller.getUserById(mockUser.id);

    // Then
    expect(result).toEqual(mockUser);
  });
});
```

#### Service 계층

- **목적**: 비즈니스 로직 검증
- **방식**: Unit Test (Mock) + Integration Test (실제 DB)
- **포인트**: 비즈니스 규칙, 트랜잭션, 도메인 로직

```typescript
describe('UserService', () => {
  it('사용자 생성 시 비즈니스 규칙을 적용해야 함', async () => {
    // Given
    const userData = { email: 'test@example.com' };

    // When
    const result = await service.createUser(userData);

    // Then
    expect(result.passwordHash).toBe(''); // 기본값 설정
  });
});
```

#### Repository 계층

- **목적**: 데이터 접근 검증
- **방식**: Integration Test (실제 DB)
- **포인트**: 쿼리 정확성, 데이터 무결성, 성능

```typescript
describe('UserRepository Integration', () => {
  it('이메일로 사용자를 찾아야 함', async () => {
    // Given
    const user = await createUser({ email: 'test@example.com' });

    // When
    const found = await repository.findByEmail('test@example.com');

    // Then
    expect(found).toBeDefined();
    expect(found?.email).toBe('test@example.com');
  });
});
```

---

## Factory 패턴 사용법

### 🏭 Factory 클래스 활용

#### UserFactory

```typescript
import { UserFactory } from '../../../test/factories/user.factory';

// 기본 사용자 생성
const user = UserFactory.create();

// 커스텀 속성으로 생성
const userWithEmail = UserFactory.create({
  email: 'custom@example.com',
  firstName: '김철수',
});

// 여러 사용자 생성
const users = UserFactory.createMany(5);

// 특정 상태의 사용자 생성
const activeUser = UserFactory.createActive();
const inactiveUser = UserFactory.createInactive();
const deletedUser = UserFactory.createDeleted();
```

#### WorkspaceFactory

```typescript
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';

// 기본 워크스페이스 생성
const workspace = WorkspaceFactory.create();

// 특정 티어의 워크스페이스 생성
const premiumWorkspace = WorkspaceFactory.createPremium();
const enterpriseWorkspace = WorkspaceFactory.createEnterprise();

// 커스텀 이름으로 생성
const customWorkspace = WorkspaceFactory.createWithName('내 워크스페이스');
```

#### MeetingFactory

```typescript
import { MeetingFactory } from '../../../test/factories/meeting.factory';

// 기본 미팅 생성
const meeting = MeetingFactory.create();

// 특정 상태의 미팅 생성
const draftMeeting = MeetingFactory.createDraft();
const completedMeeting = MeetingFactory.createCompleted();
const publishedMeeting = MeetingFactory.createPublished();

// 메모와 태그가 있는 미팅 생성
const meetingWithMemo = MeetingFactory.createWithMemo('중요한 회의');
const meetingWithTags = MeetingFactory.createWithTags(['중요', '주간회의']);
```

### 🔧 Factory 확장

새로운 Factory를 만들 때는 다음 패턴을 따르세요:

```typescript
export class NewEntityFactory {
  static create(overrides: Partial<NewEntity> = {}): NewEntity {
    const entity = new NewEntity();

    Object.assign(entity, {
      id: overrides.id || uuid(),
      // 기본값들...
      ...overrides,
    });

    return entity;
  }

  static createMany(
    count: number,
    overrides: Partial<NewEntity> = {}
  ): NewEntity[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  // 특정 상태나 속성을 가진 엔티티 생성 메서드들...
}
```

---

## 테스트 디버깅

### 🔍 테스트 실패 시 체크리스트

1. **데이터 정리 확인**

   ```typescript
   beforeEach(async () => {
     await startTransaction(em);
   });

   afterEach(async () => {
     await rollbackTransaction(em);
   });
   ```

2. **트랜잭션 상태 확인**

   ```typescript
   // 트랜잭션이 제대로 롤백되었는지 확인
   expect(em.isInTransaction()).toBe(false);
   ```

3. **격리성 확인**

   ```typescript
   // 다른 테스트와 데이터 충돌 여부 확인
   const uniqueEmail = `test-${Date.now()}@example.com`;
   ```

4. **비동기 작업 완료 대기**
   ```typescript
   // 충분한 대기 시간 설정
   await new Promise((resolve) => setTimeout(resolve, 100));
   ```

### 📊 로그 확인

```bash
# 테스트 DB 로그 확인
pnpm run test:db:logs

# 특정 테스트만 실행
pnpm run test:unit -- --testNamePattern="사용자를 생성해야 함"

# 디버그 모드로 실행
pnpm run test:debug
```

### 🐛 일반적인 문제 해결

#### 1. 데이터베이스 연결 오류

```bash
# 테스트 DB 재시작
pnpm run test:db:down
pnpm run test:db:up
```

#### 2. 포트 충돌

```bash
# 사용 중인 포트 확인
lsof -i :5432

# Docker 컨테이너 정리
docker system prune -f
```

#### 3. 메모리 부족

```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" pnpm run test
```

---

## CI/CD 통합

### 🔄 GitHub Actions 예시

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run Unit Tests
        run: pnpm run test:unit

      - name: Run Integration Tests
        run: pnpm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/test_db

      - name: Run E2E Tests
        run: pnpm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### 📈 테스트 메트릭

```bash
# 테스트 실행 시간 측정
time pnpm run test:all

# 메모리 사용량 모니터링
NODE_OPTIONS="--inspect" pnpm run test:unit
```

---

## 📚 추가 자료

- [Jest 공식 문서](https://jestjs.io/docs/getting-started)
- [NestJS 테스팅 가이드](https://docs.nestjs.com/fundamentals/testing)
- [Testcontainers 문서](https://www.testcontainers.org/)
- [MikroORM 테스팅](https://mikro-orm.io/docs/testing)

---

_이 가이드라인을 따라 일관되고 품질 높은 테스트를 작성해 주세요. 추가 질문이나 개선 사항이 있으면 언제든 문의해 주세요._
