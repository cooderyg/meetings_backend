import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../domain/permission/permission.service';
import { Action } from '../../domain/permission/entity/permission.entity';
import { AppException } from '../exception/app.exception';
import { ERROR_CODES } from '../const/error-code.const';

@Injectable()
export class SpacePermissionGuard implements CanActivate {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JWT에서 추출된 사용자 정보
    
    // 사용자 인증 확인
    if (!user) {
      throw new AppException(ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    // 메타데이터에서 필요한 권한 액션 가져오기
    const requiredAction = this.reflector.get<Action>('space-action', context.getHandler());
    if (!requiredAction) {
      return true; // 권한 설정이 없으면 통과
    }

    // URL에서 spaceId 추출
    const spaceId = request.params.spaceId || request.params.id;
    if (!spaceId) {
      throw new AppException(ERROR_CODES.AUTH_FORBIDDEN, {
        message: 'Space ID가 필요합니다.',
        details: { resource: 'space', action: requiredAction }
      });
    }

    try {
      // Space 권한 확인
      const hasPermission = await this.permissionService.hasSpacePermission(
        user.memberId, // WorkspaceMember ID
        requiredAction,
        spaceId
      );

      if (!hasPermission) {
        throw new AppException(ERROR_CODES.AUTH_FORBIDDEN, {
          message: `Space에 대한 ${requiredAction} 권한이 없습니다.`,
          details: { resource: 'space', action: requiredAction, resourceId: spaceId }
        });
      }

      return true;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(ERROR_CODES.AUTH_FORBIDDEN, {
        message: '권한 확인 중 오류가 발생했습니다.',
        details: { resource: 'space', action: requiredAction, error: error.message }
      });
    }
  }
}