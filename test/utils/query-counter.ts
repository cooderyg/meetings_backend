/**
 * Query Counter for detecting N+1 query problems
 *
 * MikroORM logger를 활용하여 실행된 쿼리 수를 추적합니다.
 * 주로 populate 최적화와 N+1 쿼리 문제 감지에 사용됩니다.
 *
 * @example
 * const queryCounter = new QueryCounter();
 * const orm = await MikroORM.init({
 *   logger: queryCounter.logQuery,
 *   debug: true,
 * });
 *
 * // In test
 * queryCounter.reset();
 * await repository.findAll({ populate: ['author'] });
 * expect(queryCounter.getCount()).toBe(1); // Should use JOIN, not N+1
 */
export class QueryCounter {
  private count: number = 0;
  private queries: string[] = [];

  /**
   * MikroORM logger 함수
   * debug: true일 때 모든 SQL 쿼리를 로깅합니다.
   */
  logQuery = (message: string): void => {
    if (message.startsWith('[query]')) {
      this.count++;
      this.queries.push(message);
    }
  };

  /**
   * 카운터 초기화
   * 각 테스트 케이스 시작 전에 호출합니다.
   */
  reset = (): void => {
    this.count = 0;
    this.queries = [];
  };

  /**
   * 실행된 쿼리 수 반환
   */
  getCount = (): number => {
    return this.count;
  };

  /**
   * 실행된 쿼리 목록 반환 (디버깅용)
   */
  getQueries = (): string[] => {
    return this.queries;
  };

  /**
   * SELECT 쿼리 수만 카운트
   */
  getSelectCount = (): number => {
    return this.queries.filter((q) => q.includes('SELECT')).length;
  };

  /**
   * INSERT 쿼리 수만 카운트
   */
  getInsertCount = (): number => {
    return this.queries.filter((q) => q.includes('INSERT')).length;
  };

  /**
   * UPDATE 쿼리 수만 카운트
   */
  getUpdateCount = (): number => {
    return this.queries.filter((q) => q.includes('UPDATE')).length;
  };

  /**
   * 쿼리 로그 출력 (디버깅용)
   */
  printQueries = (): void => {
    console.log('\n=== Query Log ===');
    this.queries.forEach((query, index) => {
      console.log(`${index + 1}. ${query}`);
    });
    console.log(`Total: ${this.count} queries\n`);
  };
}
