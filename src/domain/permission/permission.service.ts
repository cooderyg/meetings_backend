import { Injectable } from '@nestjs/common';
import { Action, ResourceSubject } from './entity/permission.entity';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from '../resource/entity/resource.entity';
import { PermissionRepository } from './permission.repository';

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  /**
   * Space 권한 확인 - 리팩토링된 버전
   */
  async hasSpacePermission(
    memberId: string,
    action: Action,
    spaceId: string
  ): Promise<boolean> {
    const space = await this.getSpaceWithPath(spaceId);
    if (!space) return false;

    // 1. Space + 상위 리소스 Visibility 체크
    const visibilityAllowed = await this.checkResourceTreeVisibility(
      space.path,
      memberId,
      action
    );
    if (!visibilityAllowed) {
      return false; // PRIVATE 리소스 접근 제한
    }

    // 2. Space 권한 체크 (Visibility 제외)
    return this.checkPermissionsOnly(
      memberId,
      action,
      ResourceSubject.SPACE,
      space.path
    );
  }

  /**
   * Meeting 권한 확인 (계층형 상속 포함) - 리팩토링된 버전
   */
  async hasMeetingPermission(
    memberId: string,
    action: Action,
    meetingId: string
  ): Promise<boolean> {
    const meeting = await this.getMeetingWithPath(meetingId);
    if (!meeting) return false;

    // 1. Meeting + 모든 상위 리소스 Visibility 체크 (한번에)
    const visibilityAllowed = await this.checkResourceTreeVisibility(
      meeting.path,
      memberId,
      action
    );
    if (!visibilityAllowed) {
      return false; // PRIVATE 리소스 접근 제한
    }

    // 2. Meeting 직접 권한 체크 (Visibility 제외)
    const directPermission = await this.checkPermissionsOnly(
      memberId,
      action,
      ResourceSubject.MEETING,
      meeting.path
    );
    if (directPermission !== null) {
      return directPermission;
    }

    // 3. 상위 Space 권한 체크 (Visibility 제외)
    const spacePath = this.getParentPath(meeting.path);
    if (!spacePath) return false;

    return this.checkPermissionsOnly(
      memberId,
      action,
      ResourceSubject.SPACE,
      spacePath
    );
  }

  /**
   * 순수 권한 확인 (Visibility 제외한 권한 로직만)
   */
  private async checkPermissionsOnly(
    memberId: string,
    action: Action,
    resourceSubject: ResourceSubject,
    resourcePath: string
  ): Promise<boolean> {
    // 1. 개별 리소스 권한 확인 (DB 쿼리만, visibility 없음)
    const resourcePermission = await this.checkDirectResourcePermission(
      memberId,
      action,
      resourceSubject,
      resourcePath
    );

    if (resourcePermission !== null) {
      return resourcePermission;
    }

    // 2. 역할 기반 권한 확인
    return this.checkRolePermission(memberId, action, resourceSubject);
  }

  /**
   * 개별 리소스 권한 직접 확인
   */
  private async checkDirectResourcePermission(
    memberId: string,
    action: Action,
    resourceSubject: ResourceSubject,
    resourcePath: string
  ): Promise<boolean | null> {
    const permission =
      await this.permissionRepository.findDirectResourcePermission(
        memberId,
        action,
        resourceSubject,
        resourcePath
      );

    if (permission?.isActive()) {
      return permission.isAllowed;
    }

    return null;
  }

  /**
   * 리소스 트리 전체 Visibility 확인 (해당 리소스 + 모든 상위 리소스)
   */
  private async checkResourceTreeVisibility(
    resourcePath: string,
    memberId: string,
    action: Action
  ): Promise<boolean> {
    // 1. 해당 리소스 + 모든 상위 경로 생성
    const allPaths = [
      resourcePath,
      ...this.generateAncestorPaths(resourcePath),
    ];

    // 2. 배치 쿼리로 모든 리소스 한번에 조회
    const allResources =
      await this.permissionRepository.findResourcesByPaths(allPaths);

    // 3. 각 리소스의 visibility 체크
    for (const resource of allResources) {
      const visibilityAllowed = await this.checkVisibilityAccess(
        resource,
        memberId,
        action
      );

      if (!visibilityAllowed) {
        return false; // 하나라도 PRIVATE 접근 불가면 전체 거부
      }
    }

    return true; // 모든 리소스 접근 가능
  }

  /**
   * Visibility 기반 접근 제어 확인
   */
  private async checkVisibilityAccess(
    resource: Resource,
    memberId: string,
    action: Action
  ): Promise<boolean> {
    // PUBLIC 리소스는 항상 통과
    if (resource.visibility === ResourceVisibility.PUBLIC) {
      return true;
    }

    // PRIVATE 리소스 접근 제어
    if (resource.visibility === ResourceVisibility.PRIVATE) {
      // 1. 명시적 권한 체크 (MemberResourcePermission) - 최우선
      const explicitPermission = await this.checkDirectResourcePermission(
        memberId,
        action,
        this.getResourceSubject(resource),
        resource.path
      );

      // 명시적 거부는 소유자라도 차단
      if (explicitPermission === false) {
        return false;
      }

      // 명시적 허용이 있으면 통과
      if (explicitPermission === true) {
        return true;
      }

      // 2. 소유자는 명시적 권한 없어도 접근 가능
      if (resource.isOwnedBy(memberId)) {
        return true;
      }

      // 3. 명시적 권한도 없고 소유자도 아니면 거부
      return false;
    }

    // 알 수 없는 visibility는 거부
    return false;
  }

  /**
   * 역할 기반 권한 확인
   */
  private async checkRolePermission(
    memberId: string,
    action: Action,
    resourceSubject: ResourceSubject
  ): Promise<boolean> {
    const member =
      await this.permissionRepository.findMemberWithRolePermissions(memberId);

    if (
      !member?.workspaceMemberRoles ||
      member.workspaceMemberRoles.length === 0
    )
      return false;

    // 다중 역할 중 하나라도 권한이 있으면 허용
    return member.workspaceMemberRoles
      .getItems()
      .some((wmr) =>
        wmr.role.rolePermissions
          .getItems()
          .some((rp) => rp.permission.covers(action, resourceSubject))
      );
  }

  /**
   * Space 리소스 조회 (backward compatibility)
   */
  private async getSpaceWithPath(spaceId: string): Promise<Resource | null> {
    return this.permissionRepository.findResourceBySpaceId(spaceId);
  }

  /**
   * Meeting 리소스 조회 (backward compatibility)
   */
  private async getMeetingWithPath(
    meetingId: string
  ): Promise<Resource | null> {
    return this.permissionRepository.findResourceByMeetingId(meetingId);
  }

  /**
   * Resource 타입에서 ResourceSubject 안전하게 추론
   */
  private getResourceSubject(resource: Resource): ResourceSubject {
    if (resource.type === ResourceType.SPACE) {
      return ResourceSubject.SPACE;
    }
    if (resource.type === ResourceType.MEETING) {
      return ResourceSubject.MEETING;
    }
    return ResourceSubject.RESOURCE; // 기본값 (다형성 리소스)
  }

  /**
   * 경로들로부터 상위 경로 목록 생성
   */
  private generateAncestorPaths(resourcePath: string): string[] {
    const pathParts = resourcePath.split('.');
    const ancestorPaths: string[] = [];

    // 루트부터 부모까지 모든 경로 생성
    for (let i = 1; i < pathParts.length; i++) {
      ancestorPaths.push(pathParts.slice(0, i).join('.'));
    }

    return ancestorPaths;
  }

  /**
   * LTree 경로에서 상위 경로 추출
   */
  private getParentPath(path: string): string | null {
    const parts = path.split('.');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('.');
  }
}
