/**
 * 테스트 데이터 생성을 위한 시퀀스 생성기
 * - Date.now() 대신 결정론적 카운터 사용
 * - 각 엔티티 타입별로 독립적인 카운터 관리
 * - 테스트 격리를 위한 reset 기능 제공
 */
export class SequenceGenerator {
  private counters: Map<string, number> = new Map();

  /**
   * 다음 시퀀스 번호 생성
   * @param key 시퀀스 키 (예: 'workspace', 'user', 'meeting')
   * @returns 증가된 시퀀스 번호
   */
  next(key: string): number {
    const current = this.counters.get(key) || 0;
    const next = current + 1;
    this.counters.set(key, next);
    return next;
  }

  /**
   * 특정 키 또는 모든 카운터 초기화
   * @param key 초기화할 시퀀스 키 (미지정시 전체 초기화)
   */
  reset(key?: string): void {
    if (key) {
      this.counters.delete(key);
    } else {
      this.counters.clear();
    }
  }

  /**
   * 현재 카운터 값 조회 (디버깅용)
   * @param key 시퀀스 키
   * @returns 현재 카운터 값 (없으면 0)
   */
  current(key: string): number {
    return this.counters.get(key) || 0;
  }
}

/**
 * 전역 시퀀스 생성기 싱글톤
 * - 모든 테스트에서 공유
 * - beforeEach/afterEach에서 reset() 호출 권장
 */
export const testSequence = new SequenceGenerator();
