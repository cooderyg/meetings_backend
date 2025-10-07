import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from '../../src/domain/resource/entity/resource.entity';
import { Workspace } from '../../src/domain/workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../src/domain/workspace-member/entity/workspace-member.entity';
import { v4 as uuid } from 'uuid';

/**
 * Resource 테스트 데이터 생성 Factory
 *
 * @example
 * const resource = ResourceFactory.create();
 * const resources = ResourceFactory.createMany(5);
 */
export class ResourceFactory {
  static create(overrides: Partial<Resource> = {}): Resource {
    const resource = new Resource();

    // 기본값 설정
    Object.assign(resource, {
      id: uuid(),
      type: ResourceType.SPACE,
      title: `Test Resource ${Date.now()}`,
      visibility: ResourceVisibility.PUBLIC,
      path: `root.${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    return resource;
  }

  /**
   * 여러 Resource 엔티티 생성
   */
  static createMany(
    count: number,
    overrides: Partial<Resource> = {}
  ): Resource[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        title: `Test Resource ${Date.now()}-${index}`,
        path: `root.${Date.now()}.${index}`,
      })
    );
  }

  /**
   * 특정 타입의 리소스 생성
   */
  static createWithType(
    type: ResourceType,
    overrides: Partial<Resource> = {}
  ): Resource {
    return this.create({
      ...overrides,
      type,
    });
  }

  /**
   * 특정 제목을 가진 리소스 생성
   */
  static createWithTitle(
    title: string,
    overrides: Partial<Resource> = {}
  ): Resource {
    return this.create({
      ...overrides,
      title,
    });
  }

  /**
   * 특정 경로를 가진 리소스 생성
   */
  static createWithPath(
    path: string,
    overrides: Partial<Resource> = {}
  ): Resource {
    return this.create({
      ...overrides,
      path,
    });
  }

  /**
   * 특정 가시성을 가진 리소스 생성
   */
  static createWithVisibility(
    visibility: ResourceVisibility,
    overrides: Partial<Resource> = {}
  ): Resource {
    return this.create({
      ...overrides,
      visibility,
    });
  }

  /**
   * 특정 워크스페이스에 속한 리소스 생성
   */
  static createForWorkspace(
    workspace: Workspace,
    overrides: Partial<Resource> = {}
  ): Resource {
    return this.create({
      ...overrides,
      workspace,
    });
  }

  /**
   * 특정 소유자가 가진 리소스 생성
   */
  static createWithOwner(
    owner: WorkspaceMember,
    overrides: Partial<Resource> = {}
  ): Resource {
    return this.create({
      ...overrides,
      owner,
    });
  }

  /**
   * 계층 구조의 리소스 생성 (부모-자식 관계)
   */
  static createHierarchy(
    parentPath: string,
    childCount: number = 1,
    overrides: Partial<Resource> = {}
  ): Resource[] {
    return Array.from({ length: childCount }, (_, index) =>
      this.create({
        ...overrides,
        path: `${parentPath}.child${index}`,
        title: `Child Resource ${index}`,
      })
    );
  }
}
