import { Space } from '../../src/domain/space/entity/space.entity';
import { Resource } from '../../src/domain/resource/entity/resource.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { v4 as uuid } from 'uuid';

/**
 * Space 테스트 데이터 생성 Factory
 *
 * @example
 * const space = SpaceFactory.create();
 * const spaces = SpaceFactory.createMany(5);
 */
export class SpaceFactory {
  static create(overrides: Partial<Space> = {}): Space {
    const space = new Space();

    // 기본값 설정
    Object.assign(space, {
      id: uuid(),
      description: `Test Space Description ${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    return space;
  }

  /**
   * 여러 Space 엔티티 생성
   */
  static createMany(count: number, overrides: Partial<Space> = {}): Space[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        description: `Test Space Description ${Date.now()}-${index}`,
      })
    );
  }

  /**
   * 특정 설명을 가진 스페이스 생성
   */
  static createWithDescription(
    description: string,
    overrides: Partial<Space> = {}
  ): Space {
    return this.create({
      ...overrides,
      description,
    });
  }

  /**
   * 특정 워크스페이스에 속한 스페이스 생성
   */
  static createForWorkspace(
    workspace: Workspace,
    overrides: Partial<Space> = {}
  ): Space {
    return this.create({
      ...overrides,
      workspace,
    });
  }

  /**
   * 특정 리소스와 연결된 스페이스 생성
   */
  static createWithResource(
    resource: Resource,
    overrides: Partial<Space> = {}
  ): Space {
    return this.create({
      ...overrides,
      resource,
      workspace: resource.workspace,
    });
  }

  /**
   * 설명이 없는 스페이스 생성
   */
  static createWithoutDescription(overrides: Partial<Space> = {}): Space {
    return this.create({
      ...overrides,
      description: null,
    });
  }
}
