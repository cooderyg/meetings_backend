import { EntityRepository } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { MemberResourcePermission } from './entity/member-resource-permission.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { Resource, ResourceType } from '../resource/entity/resource.entity';
import { Action, ResourceSubject } from './entity/permission.entity';

@Injectable()
export class PermissionRepository extends EntityRepository<MemberResourcePermission> {
  /**
   * 멤버의 특정 리소스에 대한 직접 권한 조회
   */
  async findDirectResourcePermission(
    memberId: string,
    action: Action,
    resourceSubject: ResourceSubject,
    resourcePath: string
  ): Promise<MemberResourcePermission | null> {
    return this.findOne(
      {
        workspaceMember: { id: memberId },
        permission: { action, resourceSubject },
        resourcePath,
      },
      { populate: ['permission'] }
    );
  }

  /**
   * 멤버의 역할 기반 권한 조회 (populate 포함)
   */
  async findMemberWithRolePermissions(
    memberId: string
  ): Promise<WorkspaceMember | null> {
    const memberRepo = this.em.getRepository(WorkspaceMember);
    return memberRepo.findOne(
      { id: memberId },
      {
        populate: [
          'role',
          'role.rolePermissions',
          'role.rolePermissions.permission',
        ],
      }
    );
  }

  /**
   * 리소스 조회 (owner 정보 포함)
   */
  async findResourceById(
    resourceId: string,
    type: ResourceType
  ): Promise<Resource | null> {
    const resourceRepo = this.em.getRepository(Resource);
    return resourceRepo.findOne(
      {
        id: resourceId,
        type: type,
      },
      { populate: ['owner'] }
    );
  }

  /**
   * 여러 경로의 리소스들을 배치로 조회
   */
  async findResourcesByPaths(paths: string[]): Promise<Resource[]> {
    const resourceRepo = this.em.getRepository(Resource);
    return resourceRepo.find({ path: { $in: paths } }, { populate: ['owner'] });
  }

  /**
   * 특정 경로 하위의 모든 리소스 권한 조회
   */
  async findResourcePermissionsByPathPattern(
    memberId: string,
    pathPattern: string
  ): Promise<MemberResourcePermission[]> {
    return this.find(
      {
        workspaceMember: { id: memberId },
        resourcePath: { $like: `${pathPattern}%` },
      },
      { populate: ['permission'] }
    );
  }

  /**
   * 멤버의 모든 활성 권한 조회
   */
  async findActivePermissionsByMember(
    memberId: string
  ): Promise<MemberResourcePermission[]> {
    return this.find(
      {
        workspaceMember: { id: memberId },
        isAllowed: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
      { populate: ['permission'] }
    );
  }
}
