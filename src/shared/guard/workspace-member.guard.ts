import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { WorkspaceMemberService } from '../../domain/workspace-member/workspace-member.service';
import { AppException } from '../exception/app.exception';
import { ERROR_CODES } from '../const/error-code.const';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { workspaceId, user } = request;

    if (!user) {
      throw new AppException(ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    if (!workspaceId) {
      throw new AppException(ERROR_CODES.AUTH_FORBIDDEN, {
        message: 'Workspace ID가 필요합니다.',
      });
    }

    try {
      const isActiveMember = await this.workspaceMemberService.isActiveMember(
        user.id,
        workspaceId
      );

      if (!isActiveMember) {
        throw new AppException(ERROR_CODES.AUTH_FORBIDDEN, {
          message: '해당 워크스페이스의 멤버가 아닙니다.',
          details: {
            userId: user.id,
            workspaceId,
          },
        });
      }

      return true;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(ERROR_CODES.AUTH_FORBIDDEN, {
        message: '워크스페이스 멤버십 확인 중 오류가 발생했습니다.',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
