import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Action } from '../../domain/permission/entity/permission.entity';
import { MeetingPermissionGuard } from '../guard/meeting-permission.guard';

/**
 * Meeting 권한 확인 데코레이터 (계층형 상속 포함)
 * 
 * @param action - 필요한 권한 액션 (create, read, update, delete, manage)
 * 
 * @example
 * ```typescript
 * @Get(':id')
 * @RequireMeetingPermission(Action.READ)
 * async getMeeting(@Param('id') id: string) {
 *   // Meeting 직접 권한 또는 상위 Space 권한으로 접근 가능
 * }
 * ```
 */
export const RequireMeetingPermission = (action: Action) =>
  applyDecorators(
    SetMetadata('meeting-action', action),
    UseGuards(MeetingPermissionGuard)
  );