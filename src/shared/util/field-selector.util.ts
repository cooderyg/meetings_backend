/**
 * 타입 안전한 필드 선택을 위한 유틸리티
 */

/**
 * 중첩된 객체의 모든 가능한 키 경로를 추출하는 타입
 * 예: Meeting → 'id' | 'status' | 'resource' | 'resource.id' | 'resource.title' | ...
 */
export type DeepKeys<T> = T extends object
  ? T extends any[]
    ? never
    : T extends Date
      ? never
      : {
          [K in keyof T]: K extends string
            ? T[K] extends object
              ? T[K] extends any[]
                ? K
                : T[K] extends Date
                  ? K
                  : K | `${K}.${DeepKeys<T[K]>}`
              : K
            : never;
        }[keyof T]
  : never;

/**
 * 필드 경로에서 해당하는 타입을 추출
 */
export type DeepValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * 선택된 필드들로 새로운 타입 생성
 */
export type PickDeep<T, K extends DeepKeys<T>> = {
  [P in K as P extends `${infer Root}.${string}`
    ? Root
    : P]: P extends `${infer Root}.${infer Rest}`
    ? Root extends keyof T
      ? PickDeep<T[Root], Rest extends DeepKeys<T[Root]> ? Rest : never>
      : never
    : P extends keyof T
      ? T[P]
      : never;
};

/**
 * 필드 선택자 생성 함수
 */
export function createFieldSelector<T>() {
  return {
    /**
     * 타입 안전한 필드 선택
     * @param fields 선택할 필드 경로 배열
     */
    fields: <K extends DeepKeys<T>>(fields: readonly K[]): readonly K[] => {
      return fields;
    },

    /**
     * 필드 경로 검증
     * @param field 검증할 필드 경로
     */
    isValidField: (field: string): field is DeepKeys<T> => {
      // 런타임 검증 로직 (필요시 구현)
      return true;
    },
  };
}

/**
 * 필드 배열에서 중복 제거 및 정렬
 */
export function normalizeFields<T extends readonly string[]>(fields: T): T {
  return [...new Set(fields)].sort() as any;
}

/**
 * 필드 경로를 기반으로 populate 옵션 생성
 * 'resource.owner.name' → ['resource', 'resource.owner']
 */
export function extractPopulateFromFieldsTyped<T>(
  fields: readonly DeepKeys<T>[]
): string[] {
  const populateSet = new Set<string>();

  fields.forEach((field) => {
    const parts = (field as string).split('.');
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const populatePath = parts.slice(0, i).join('.');
        populateSet.add(populatePath);
      }
    }
  });

  return Array.from(populateSet);
}

/**
 * 타입 가드: 문자열이 유효한 필드 경로인지 확인
 */
export function isDeepKey<T>(key: string, _entity?: T): key is DeepKeys<T> {
  // 컴파일 타임에만 타입 체크, 런타임에는 true 반환
  return true;
}

/**
 * 사용 예시:
 *
 * const meetingSelector = createFieldSelector<Meeting>();
 * const fields = meetingSelector.fields([
 *   'id',
 *   'status',
 *   'resource.title',
 *   'resource.owner.firstName'
 * ]);
 *
 * // 타입 에러 예시:
 * // const invalidFields = meetingSelector.fields(['invalidField']); // ❌ 컴파일 에러
 */
