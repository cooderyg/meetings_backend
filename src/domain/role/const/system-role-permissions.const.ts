import {
  Action,
  ResourceSubject,
} from '../../permission/entity/permission.entity';
import { SystemRole } from '../enum/system-role.enum';

export interface PermissionRule {
  action: Action;
  subject: ResourceSubject;
}

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, PermissionRule[]> = {
  [SystemRole.OWNER]: [{ action: Action.MANAGE, subject: ResourceSubject.ALL }],

  [SystemRole.ADMIN]: [
    { action: Action.MANAGE, subject: ResourceSubject.SPACE },
    { action: Action.MANAGE, subject: ResourceSubject.MEETING },
    { action: Action.MANAGE, subject: ResourceSubject.LOGIN_EVENT },
  ],

  [SystemRole.FULL_EDIT]: [
    { action: Action.MANAGE, subject: ResourceSubject.SPACE },
    { action: Action.MANAGE, subject: ResourceSubject.MEETING },
  ],

  [SystemRole.CAN_EDIT]: [
    { action: Action.CREATE, subject: ResourceSubject.SPACE },
    { action: Action.UPDATE, subject: ResourceSubject.SPACE },
    { action: Action.DELETE, subject: ResourceSubject.SPACE },
    { action: Action.CREATE, subject: ResourceSubject.MEETING },
    { action: Action.UPDATE, subject: ResourceSubject.MEETING },
    { action: Action.DELETE, subject: ResourceSubject.MEETING },
  ],

  [SystemRole.CAN_VIEW]: [
    { action: Action.READ, subject: ResourceSubject.SPACE },
    { action: Action.READ, subject: ResourceSubject.MEETING },
  ],
};

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  [SystemRole.OWNER]: '워크스페이스 소유자 - 모든 권한 및 시스템 관리',
  [SystemRole.ADMIN]: '관리자 - 컨텐츠 관리 및 시스템 로그 관리',
  [SystemRole.FULL_EDIT]: '완전 편집자 - 공간/회의 완전 관리 권한',
  [SystemRole.CAN_EDIT]: '편집자 - 컨텐츠 생성, 수정, 삭제 권한',
  [SystemRole.CAN_VIEW]: '뷰어 - 컨텐츠 읽기 권한만',
};
