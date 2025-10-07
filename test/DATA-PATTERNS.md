# Test Data 생성 패턴 가이드

## 개요

테스트 데이터 생성을 위한 3단계 계층 구조:

- **Fixture** (저수준): 단순한 엔티티 생성
- **Factory** (중수준): 복잡한 엔티티 커스터마이징 + Fluent API
- **Object Mother** (고수준): 비즈니스 시나리오 재현

## 1. Fixture - 저수준 패턴

### 사용 시점

- 단일 엔티티를 빠르게 생성해야 할 때
- 최소한의 커스터마이징만 필요할 때
- 단위 테스트에서 간단한 의존성을 만들 때

### 특징

- 함수 기반 (function)
- 즉시 DB 저장 (`persistAndFlush`)
- 기본값 자동 생성 (SequenceGenerator 활용)

### 예시

```typescript
import { createUserFixture } from '../fixtures/user.fixture';
import { createWorkspaceFixture } from '../fixtures/workspace.fixture';

// 기본값으로 생성
const user = await createUserFixture(em);
// user.email = 'test1@example.com'
// user.firstName = '길동'

// 일부만 오버라이드
const workspace = await createWorkspaceFixture(em, {
  name: 'My Workspace',
});
```

### 위치

```
test/fixtures/
├── user.fixture.ts
├── workspace.fixture.ts
├── meeting.fixture.ts
└── resource.fixture.ts
```

## 2. Factory - 중수준 패턴

### 사용 시점

- 복잡한 엔티티 커스터마이징이 필요할 때
- Fluent API로 가독성 높은 설정을 원할 때
- 여러 엔티티를 일괄 생성해야 할 때
- DB 저장 전 엔티티만 필요할 때 (`build()`)

### 특징

- 클래스 기반
- Fluent API 지원 (메서드 체이닝)
- `build()` - 엔티티만 생성 (DB 저장 안 함)
- `create()` - 엔티티 생성 + DB 저장
- `createList()` - 여러 엔티티 일괄 생성

### 예시

```typescript
import { UserFactory } from '../factories/user.factory';
import { WorkspaceFactory } from '../factories/workspace.factory';
import { MeetingFactory } from '../factories/meeting.factory';

// Fluent API로 커스터마이징
const admin = await new UserFactory(em)
  .withName('Admin', 'User')
  .withEmail('admin@example.com')
  .asActive()
  .create();

// 여러 엔티티 일괄 생성
const users = await new UserFactory(em).createList(5);

// Premium 워크스페이스 생성
const workspace = await new WorkspaceFactory(em)
  .withName('Premium Team')
  .asPremium()
  .create();

// 완료된 미팅 생성
const meeting = await new MeetingFactory(em)
  .forWorkspace(workspace)
  .asCompleted()
  .withMemo('회의 완료')
  .withTags('중요', '검토필요')
  .create();

// DB 저장 없이 엔티티만 생성
const draft = await new MeetingFactory(em).asDraft().build();
```

### 위치

```
test/factories/
├── base.factory.ts       # BaseFactory<T> 추상 클래스
├── user.factory.ts
├── workspace.factory.ts
├── meeting.factory.ts
└── resource.factory.ts
```

## 3. Object Mother - 고수준 패턴

### 사용 시점

- 복잡한 비즈니스 시나리오를 재현할 때
- 여러 엔티티 간 관계가 중요한 테스트
- E2E 테스트에서 실제 프로덕션 환경 시뮬레이션
- 반복적인 테스트 설정을 재사용할 때

### 특징

- 클래스 기반
- 여러 Factory/Fixture를 조합
- 비즈니스 의미 있는 메서드명
- 완전한 컨텍스트 반환 (workspace, admin, members 등)

### 예시

```typescript
import { WorkspaceScenarios } from '../scenarios/workspace.scenarios';
import { MeetingScenarios } from '../scenarios/meeting.scenarios';

const workspaceScenarios = new WorkspaceScenarios(em);
const meetingScenarios = new MeetingScenarios(em);

// 관리자가 있는 워크스페이스
const { workspace, admin, adminMember } =
  await workspaceScenarios.createWorkspaceWithAdmin();

// 5명의 멤버가 있는 팀 워크스페이스
const { workspace, admin, members, workspaceMembers } =
  await workspaceScenarios.createWorkspaceWithMembers(5);

// 완전히 설정된 프리미엄 팀
const team = await workspaceScenarios.createFullTeamWorkspace();
// team.workspace, team.admin, team.regularMembers, team.viewers

// 팀 미팅 시나리오 (5명 참석자)
const { meeting, workspace, participants } =
  await meetingScenarios.createTeamMeeting(5);

// 미팅 전체 워크플로우 (Draft → In Progress → Completed)
const workflow = await meetingScenarios.createMeetingWorkflow();
// workflow.draftMeeting, workflow.inProgressMeeting, workflow.completedMeeting
```

### 위치

```
test/scenarios/
├── workspace.scenarios.ts
└── meeting.scenarios.ts
```

## 패턴 선택 가이드

### Fixture를 사용하는 경우

```typescript
// ✅ 좋은 예: 단위 테스트에서 단순 의존성
describe('MeetingService', () => {
  it('should create meeting', async () => {
    const workspace = await createWorkspaceFixture(em);
    const user = await createUserFixture(em);

    const result = await service.createMeeting({ workspace, user });
    expect(result).toBeDefined();
  });
});
```

### Factory를 사용하는 경우

```typescript
// ✅ 좋은 예: 복잡한 커스터마이징 필요
describe('MeetingRepository', () => {
  it('should find completed meetings only', async () => {
    const workspace = await new WorkspaceFactory(em).create();

    // 완료된 미팅 3개
    await new MeetingFactory(em)
      .forWorkspace(workspace)
      .asCompleted()
      .createList(3);

    // Draft 미팅 2개
    await new MeetingFactory(em)
      .forWorkspace(workspace)
      .asDraft()
      .createList(2);

    const completed = await repository.findCompletedMeetings(workspace.id);
    expect(completed).toHaveLength(3);
  });
});
```

### Object Mother를 사용하는 경우

```typescript
// ✅ 좋은 예: E2E 테스트에서 비즈니스 시나리오
describe('Meeting E2E', () => {
  it('should handle team meeting workflow', async () => {
    const scenarios = new MeetingScenarios(em);

    // 팀 미팅 전체 시나리오 설정
    const { meeting, workspace, participants } =
      await scenarios.createTeamMeeting(5);

    // API 테스트
    const response = await request(app.getHttpServer())
      .get(`/workspace/${workspace.id}/meetings/${meeting.id}`)
      .expect(200);

    expect(response.body.status).toBe(MeetingStatus.IN_PROGRESS);
    expect(participants).toHaveLength(5);
  });
});
```

## 안티 패턴

### ❌ 나쁜 예 1: E2E 테스트에서 Fixture 남용

```typescript
// ❌ 나쁨: 복잡한 설정을 Fixture로 반복
it('should test team meeting', async () => {
  const workspace = await createWorkspaceFixture(em);
  const admin = await createUserFixture(em);
  const adminMember = await createWorkspaceMemberFixture(em, { workspace, user: admin });
  const user1 = await createUserFixture(em, { email: 'user1@example.com' });
  const user2 = await createUserFixture(em, { email: 'user2@example.com' });
  const member1 = await createWorkspaceMemberFixture(em, { workspace, user: user1 });
  const member2 = await createWorkspaceMemberFixture(em, { workspace, user: user2 });
  // ... 반복되는 설정

  // ✅ 좋음: Object Mother 사용
  const scenarios = new MeetingScenarios(em);
  const { meeting, workspace, participants } = await scenarios.createTeamMeeting(2);
});
```

### ❌ 나쁜 예 2: 단위 테스트에서 Object Mother 과용

```typescript
// ❌ 나쁨: 단순한 단위 테스트에 시나리오 사용
it('should validate email format', () => {
  const scenarios = new WorkspaceScenarios(em);
  const { workspace, admin } = await scenarios.createFullTeamWorkspace();

  expect(validateEmail(admin.email)).toBe(true);

  // ✅ 좋음: Fixture 사용
  const user = await createUserFixture(em);
  expect(validateEmail(user.email)).toBe(true);
});
```

### ❌ 나쁜 예 3: Factory 없이 수동 엔티티 생성

```typescript
// ❌ 나쁨: 수동 생성 + 반복 코드
const meeting1 = new Meeting();
meeting1.workspace = workspace;
meeting1.status = MeetingStatus.COMPLETED;
meeting1.memo = 'Test memo';
await em.persistAndFlush(meeting1);

const meeting2 = new Meeting();
meeting2.workspace = workspace;
meeting2.status = MeetingStatus.COMPLETED;
meeting2.memo = 'Test memo';
await em.persistAndFlush(meeting2);

// ✅ 좋음: Factory 사용
await new MeetingFactory(em)
  .forWorkspace(workspace)
  .asCompleted()
  .withMemo('Test memo')
  .createList(2);
```

## 계층 간 협력

Object Mother는 Factory를 조합하고, Factory는 Fixture를 활용할 수 있습니다:

```typescript
// Object Mother가 Factory 조합
export class WorkspaceScenarios {
  async createWorkspaceWithAdmin(): Promise<{...}> {
    // Factory 사용
    const workspace = await new WorkspaceFactory(this.em).create();
    const admin = await new UserFactory(this.em).create();

    // Fixture 사용
    const adminMember = await createWorkspaceMemberFixture(this.em, {
      workspace,
      user: admin,
    });

    return { workspace, admin, adminMember };
  }
}
```

## 결론

- **Fixture**: 빠르고 단순한 엔티티 생성
- **Factory**: 복잡한 커스터마이징 + Fluent API
- **Object Mother**: 비즈니스 시나리오 재현

테스트의 복잡도와 목적에 따라 적절한 패턴을 선택하세요.
