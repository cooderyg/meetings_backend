import {
  Permission,
  Action,
  ResourceSubject,
} from '../../src/domain/permission/entity/permission.entity';
import { v4 as uuid } from 'uuid';

/**
 * Permission 테스트 데이터 생성 Factory
 */
export class PermissionFactory {
  /**
   * 단일 Permission 엔티티 생성
   */
  static create(overrides: Partial<Permission> = {}): Permission {
    const permission = new Permission();

    Object.assign(permission, {
      id: overrides.id || Math.floor(Math.random() * 10000),
      action: overrides.action || Action.READ,
      subject: overrides.subject || ResourceSubject.SPACE,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    });

    return permission;
  }

  /**
   * 읽기 권한 생성
   */
  static createReadPermission(
    subject: ResourceSubject = ResourceSubject.MEETING,
    overrides: Partial<Permission> = {}
  ): Permission {
    return this.create({
      action: Action.READ,
      subject,
      ...overrides,
    });
  }

  /**
   * 쓰기 권한 생성
   */
  static createWritePermission(
    subject: ResourceSubject = ResourceSubject.MEETING,
    overrides: Partial<Permission> = {}
  ): Permission {
    return this.create({
      action: Action.WRITE,
      subject,
      ...overrides,
    });
  }

  /**
   * 삭제 권한 생성
   */
  static createDeletePermission(
    subject: ResourceSubject = ResourceSubject.MEETING,
    overrides: Partial<Permission> = {}
  ): Permission {
    return this.create({
      action: Action.DELETE,
      subject,
      ...overrides,
    });
  }

  /**
   * 공유 권한 생성
   */
  static createSharePermission(
    subject: ResourceSubject = ResourceSubject.MEETING,
    overrides: Partial<Permission> = {}
  ): Permission {
    return this.create({
      action: Action.SHARE,
      subject,
      ...overrides,
    });
  }

  /**
   * 모든 권한 세트 생성
   */
  static createFullPermissions(
    subject: ResourceSubject = ResourceSubject.MEETING
  ): Permission[] {
    return [
      this.createReadPermission(subject),
      this.createWritePermission(subject),
      this.createDeletePermission(subject),
      this.createSharePermission(subject),
    ];
  }

  /**
   * 여러 Permission 엔티티 생성
   */
  static createMany(
    count: number,
    overrides: Partial<Permission> = {}
  ): Permission[] {
    const actions = Object.values(Action);
    const subjects = Object.values(ResourceSubject);

    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        action: overrides.action || actions[index % actions.length],
        subject: overrides.subject || subjects[index % subjects.length],
      })
    );
  }
}
