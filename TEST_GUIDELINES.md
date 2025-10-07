# 테스트 작성 가이드라인

## 📋 목차

- [테스트 케이스 작성 규칙](#테스트-케이스-작성-규칙)
- [테스트 전략](#테스트-전략)
- [테스트 작성 체크리스트](#테스트-작성-체크리스트)

## 테스트 케이스 작성 규칙

### 언어 규칙

- **모든 테스트 케이스는 한국어로 작성**
- `describe()` 블록: 영어 또는 한국어 혼용 가능
- `it()` 블록: **반드시 한국어 사용**

### 작성 패턴

**기본 패턴**: "~해야 함" 형식 사용

| 영어 패턴 | 한국어 패턴 | 예시 |
|-----------|------------|------|
| should create | 생성해야 함 | `it('새 meeting을 생성해야 함', async () => {})` |
| should return | 반환해야 함 | `it('meeting 목록을 반환해야 함', async () => {})` |
| should update | 업데이트해야 함 | `it('meeting 상태를 업데이트해야 함', async () => {})` |
| should delete | 삭제해야 함 | `it('meeting을 소프트 삭제해야 함', async () => {})` |
| should throw | 던져야 함 | `it('존재하지 않는 경우 에러를 던져야 함', async () => {})` |
| should validate | 검증해야 함 | `it('UUID 형식을 검증해야 함', async () => {})` |
| should fail | 실패해야 함 | `it('권한이 없는 경우 실패해야 함', async () => {})` |
| should filter | 필터링해야 함 | `it('상태로 meeting을 필터링해야 함', async () => {})` |
| should isolate | 격리해야 함 | `it('workspace별로 데이터를 격리해야 함', async () => {})` |
| should populate | 로드해야 함 | `it('관계 엔티티를 로드해야 함', async () => {})` |
| should find | 찾아야 함 | `it('조건에 맞는 데이터를 찾아야 함', async () => {})` |

### 부정/예외 케이스 패턴

| 영어 패턴 | 한국어 패턴 | 예시 |
|-----------|------------|------|
| for non-existent | 존재하지 않는 ~에 대해 | `it('존재하지 않는 meeting에 대해 null을 반환해야 함', async () => {})` |
| for invalid | 유효하지 않은 ~에 대해 | `it('유효하지 않은 UUID에 대해 에러를 던져야 함', async () => {})` |
| when missing | ~이 없는 경우 | `it('필수 필드가 없는 경우 에러를 던져야 함', async () => {})` |
| without permission | 권한이 없는 경우 | `it('권한이 없는 경우 접근을 거부해야 함', async () => {})` |
| when completed | 완료된 경우 | `it('완료된 meeting을 발행해야 함', async () => {})` |
| when not completed | 완료되지 않은 경우 | `it('완료되지 않은 meeting에 대해 에러를 던져야 함', async () => {})` |

### 실제 예시

#### ✅ 올바른 예시

```typescript
describe('MeetingService', () => {
  describe('createMeeting', () => {
    it('필수 필드를 모두 포함하여 meeting을 생성해야 함', async () => {
      const meeting = await service.createMeeting({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        parentPath: '/',
      });

      expect(meeting).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.DRAFT);
    });

    it('존재하지 않는 workspace에 대해 에러를 던져야 함', async () => {
      await expect(
        service.createMeeting({
          workspaceId: 'invalid-id',
          workspaceMemberId: member.id,
          parentPath: '/',
        })
      ).rejects.toThrow();
    });
  });

  describe('publishMeeting', () => {
    it('완료된 meeting을 발행해야 함', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.COMPLETED,
      });

      const published = await service.publishMeeting(meeting.id);
      expect(published.status).toBe(MeetingStatus.PUBLISHED);
    });

    it('완료되지 않은 meeting에 대해 AppError를 던져야 함', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.DRAFT,
      });

      await expect(
        service.publishMeeting(meeting.id)
      ).rejects.toThrow(AppError);
    });
  });
});
```

#### ❌ 피해야 할 예시

```typescript
describe('MeetingService', () => {
  // ❌ 영어 테스트 케이스
  it('should create meeting with all required fields', async () => {
    // ...
  });

  // ❌ 한영 혼용
  it('should create meeting을 생성해야 함', async () => {
    // ...
  });

  // ❌ 명사형 종결
  it('meeting 생성', async () => {
    // ...
  });
});
```

### 적용 범위

- **E2E 테스트** (`test/e2e/*.e2e-spec.ts`)
- **통합 테스트** (`src/domain/**/*.integration.spec.ts`)
- **단위 테스트** (`src/domain/**/*.spec.ts`)

### 기존 코드 상태

- ✅ 모든 기존 테스트는 이미 한국어로 변환 완료
- ✅ 새로운 테스트 작성 시 이 규칙을 따를 것

## 테스트 전략

### Controller 테스트 원칙

#### Pure Orchestrator → E2E 테스트만 작성

**정의**: 비즈니스 로직 없이 서비스 메서드를 직접 호출하는 컨트롤러

**특징**:
- 조건문(if/else/switch) 없음
- 데이터 변환 없음 또는 최소한의 DTO 매핑
- 단일 서비스 의존성

**테스트 전략**:
- ✅ E2E 테스트로 실제 HTTP → Service → Repository 전체 흐름 검증
- ❌ 컨트롤러 단위 테스트 작성 금지 (Mock 기반 echo chamber 방지)

#### Logician Controller → 통합 테스트 작성

**정의**: 입력 검증, 데이터 변환, 복잡한 조율 로직이 있는 컨트롤러

**특징**:
- 입력 검증 로직 (예: `if (!file) throw BadRequestException`)
- 데이터 집계/변환 (예: `totalSize = files.reduce(...)`)
- 다중 서비스 호출 조율

**테스트 전략**:
- ✅ 통합 테스트로 실제 인터셉터/가드와 함께 검증
- ✅ 검증 로직의 경계값 테스트
- ⚠️ Mock은 외부 의존성(S3, DB)에만 제한적 사용

### 테스트 계층별 가이드

#### 1. E2E 테스트 (최우선)
- **대상**: 모든 API 엔드포인트
- **범위**: HTTP 요청 → Controller → Service → Repository → DB
- **도구**: Supertest + TestingModule
- **목적**: 실제 사용자 시나리오 검증

#### 2. Service 통합 테스트
- **대상**: 비즈니스 로직이 있는 모든 Service
- **범위**: Service → Repository → 실제 DB (Testcontainer)
- **도구**: Jest + MikroORM + PostgreSQL
- **목적**: 비즈니스 로직과 데이터 무결성 검증

#### 3. Repository 통합 테스트
- **대상**: 복잡한 쿼리/데이터 접근 로직
- **범위**: Repository → 실제 DB
- **도구**: Jest + MikroORM + Testcontainer
- **목적**: 쿼리 정확성 및 데이터 영속성 검증

#### 4. Controller 단위 테스트
- **작성 금지 대상**: Pure Orchestrator 컨트롤러
- **작성 허용 대상**: Logician 컨트롤러 (검증 로직 있는 경우만)

### Mock 사용 원칙

#### ❌ 피해야 할 패턴

```typescript
// ❌ Mock echo chamber (검증 가치 없음)
jest.spyOn(service, 'createMeeting').mockResolvedValue(mockMeeting);
const result = await controller.create(...);
expect(result).toEqual(mockMeeting); // Mock이 반환한 값 확인만 함

// ❌ Mock 계약 검증 (구현 세부사항 테스트)
expect(service.createMeeting).toHaveBeenCalledWith({
  workspaceId: 'xxx',
  workspaceMemberId: 'yyy',
}); // 서비스 메서드 시그니처 변경 시 깨짐
```

#### ✅ 허용되는 Mock 사용

```typescript
// ✅ 외부 서비스 Mock (통제 불가능한 의존성)
jest.spyOn(s3Client, 'upload').mockResolvedValue({ Location: '...' });

// ✅ 시간 의존성 Mock (비결정적 동작 제어)
jest.spyOn(Date, 'now').mockReturnValue(1704067200000);
```

## 테스트 작성 체크리스트

새 기능 개발 시:

1. [ ] E2E 테스트 작성 (필수)
2. [ ] Service 통합 테스트 작성 (비즈니스 로직 있으면 필수)
3. [ ] Repository 테스트 작성 (복잡한 쿼리 있으면 필수)
4. [ ] Controller 단위 테스트 작성 (Logician 컨트롤러만)
5. [ ] **모든 테스트 케이스를 한국어로 작성 (필수)**

## 추가 리소스

- 자세한 테스트 구조는 [CLAUDE.md](./CLAUDE.md)의 "테스트 전략" 섹션 참조
- TestModuleBuilder 사용법은 [test/utils/test-module.builder.ts](./test/utils/test-module.builder.ts) 참조
- E2E 테스트 예시는 [test/e2e/meeting.e2e-spec.ts](./test/e2e/meeting.e2e-spec.ts) 참조
- 통합 테스트 예시는 [src/domain/meeting/meeting.service.integration.spec.ts](./src/domain/meeting/meeting.service.integration.spec.ts) 참조
