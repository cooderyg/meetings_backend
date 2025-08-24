import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../domain/permission/permission.service';
import { Action } from '../../domain/permission/entity/permission.entity';
import { AppError } from '../exception/app.error';

@Injectable()
export class SpacePermissionGuard implements CanActivate {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JWT에서 추출된 사용자 정보

    // 사용자 인증 확인
    if (!user) {
      throw new AppError('auth.validate.failed');
    }

    // 메타데이터에서 필요한 권한 액션 가져오기
    const requiredAction = this.reflector.get<Action>(
      'space-action',
      context.getHandler()
    );
    if (!requiredAction) {
      return true; // 권한 설정이 없으면 통과
    }

    // URL에서 spaceId 추출
    const spaceId = request.params.spaceId || request.params.id;
    if (!spaceId) {
      throw new AppError('auth.authorize.denied');
    }

    try {
      // Space 권한 확인
      const hasPermission = await this.permissionService.hasSpacePermission(
        user.memberId, // WorkspaceMember ID
        requiredAction,
        spaceId
      );

      if (!hasPermission) {
        throw new AppError('auth.authorize.denied');
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('auth.authorize.denied');
    }
  }
}
