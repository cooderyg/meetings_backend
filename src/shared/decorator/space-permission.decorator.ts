import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Action } from '../../domain/permission/entity/permission.entity';
import { SpacePermissionGuard } from '../guard/space-permission.guard';

/**
 * Space 권한 확인 데코레이터
 *
 * @param action - 필요한 권한 액션 (create, read, update, delete, manage)
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @RequireSpacePermission(Action.READ)
 * async getSpace(@Param('id') id: string) {
 *   // Space 읽기 권한 확인 후 실행
 * }
 * ```
 */
export const RequireSpacePermission = (action: Action) =>
  applyDecorators(
    SetMetadata('space-action', action),
    UseGuards(SpacePermissionGuard)
  );
