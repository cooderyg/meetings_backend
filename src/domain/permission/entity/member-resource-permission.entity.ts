import { Entity, Property, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { WorkspaceMember } from '../../workspace-member/entity/workspace-member.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Permission } from './permission.entity';
import { LTreeType } from '../../../shared/type/ltree.type';

@Entity({ tableName: 'member_resource_permissions' })
@Unique({ properties: ['workspaceMember', 'permission', 'resourcePath'] })
@Index({ properties: ['workspaceMember', 'workspace'] })
export class MemberResourcePermission extends BaseEntity {

  @ManyToOne(() => WorkspaceMember)
  workspaceMember!: WorkspaceMember;

  @ManyToOne(() => Workspace)
  workspace!: Workspace;

  @ManyToOne(() => Permission)
  permission!: Permission;

  @Property({ type: LTreeType })
  @Index({ type: 'gist' })
  resourcePath!: string;

  @Property({ default: true })
  isAllowed: boolean = true;

  @Property({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null = null;

  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  isActive(): boolean {
    return this.isAllowed && !this.isExpired();
  }

  /**
   * 권한이 허용되어 있고 활성 상태인지 확인
   */
  isGranted(): boolean {
    return this.isActive() && this.isAllowed;
  }

  /**
   * 권한이 명시적으로 거부되었는지 확인
   */
  isDenied(): boolean {
    return this.isActive() && !this.isAllowed;
  }

  /**
   * 특정 액션과 리소스 타입에 대한 권한인지 확인
   */
  matchesPermission(action: string, resourceSubject: string): boolean {
    return this.permission.action === action && 
           this.permission.resourceSubject === resourceSubject;
  }

  /**
   * 경로가 일치하는지 확인 (LTree 경로 비교)
   */
  matchesPath(targetPath: string): boolean {
    return this.resourcePath === targetPath;
  }

  /**
   * 하위 경로에 대한 권한인지 확인
   */
  coversPath(targetPath: string): boolean {
    return targetPath.startsWith(this.resourcePath + '.');
  }
}