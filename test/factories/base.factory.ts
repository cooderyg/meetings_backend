import { EntityManager } from '@mikro-orm/postgresql';

/**
 * Test Data Builder 패턴의 기본 추상 클래스
 * - Fluent API로 테스트 데이터 생성
 * - 메서드 체이닝 지원
 * - 기본값 + 선택적 오버라이드
 */
export abstract class BaseFactory<T> {
  protected em: EntityManager;
  protected overrides: Partial<T> = {};

  constructor(em: EntityManager) {
    this.em = em;
  }

  /**
   * 엔티티 인스턴스 생성 (메모리에만 존재)
   * @param overrides 특정 필드 오버라이드
   * @returns 생성된 엔티티 (persist 전)
   */
  abstract build(overrides?: Partial<T>): T | Promise<T>;

  /**
   * 엔티티 생성 및 DB 저장
   * @param overrides 특정 필드 오버라이드
   * @returns 저장된 엔티티
   */
  async create(overrides?: Partial<T>): Promise<T> {
    const entity = await this.build(overrides);
    await this.em.persistAndFlush(entity as any); // MikroORM 타입 호환
    return entity;
  }

  /**
   * 여러 엔티티 일괄 생성
   * @param count 생성할 개수
   * @param overrides 공통 오버라이드
   * @returns 저장된 엔티티 배열
   */
  async createList(count: number, overrides?: Partial<T>): Promise<T[]> {
    const entities = await Promise.all(
      Array.from({ length: count }, () => this.build(overrides))
    );
    await this.em.persistAndFlush(entities as any); // MikroORM 타입 호환
    return entities;
  }

  /**
   * 오버라이드 설정을 초기화하고 새 인스턴스 반환
   * @returns 새로운 Factory 인스턴스
   */
  reset(): this {
    const constructor = this.constructor as new (em: EntityManager) => this;
    return new constructor(this.em);
  }
}
