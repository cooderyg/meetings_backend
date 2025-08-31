/**
 * 필드 배열 처리 유틸리티
 */

/**
 * 중첩 필드를 객체 구조로 변환
 * @param fields ['id', 'resource.title', 'resource.owner.name']
 * @returns { id: true, resource: { title: true, owner: { name: true } } }
 */
export function fieldsToNestedObject(
  fields: readonly string[]
): Record<string, any> {
  const result: Record<string, any> = {};

  fields.forEach((field) => {
    const parts = field.split('.');
    let current = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // 마지막 부분은 true로 설정
        current[part] = true;
      } else {
        // 중간 부분은 객체로 생성
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });

  return result;
}

/**
 * 필드 배열에서 최상위 필드들만 추출
 * @param fields ['id', 'resource.title', 'workspace.name']
 * @returns ['id', 'resource', 'workspace']
 */
export function extractRootFields(fields: readonly string[]): string[] {
  const rootFields = new Set<string>();

  fields.forEach((field) => {
    const rootField = field.split('.')[0];
    rootFields.add(rootField);
  });

  return Array.from(rootFields);
}
