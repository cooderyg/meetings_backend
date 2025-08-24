import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WorkspaceMemberService } from '../../domain/workspace-member/workspace-member.service';
import { AppError } from '../exception/app.error';
import { IRequest } from '../type/request.type';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IRequest>();
    const { workspaceId, user } = request;

    if (!user) {
      throw new AppError('auth.validate.failed');
    }

    if (!workspaceId) {
      throw new AppError('auth.authorize.denied');
    }

    try {
      const member = await this.workspaceMemberService.findByUserAndWorkspace(
        user.id,
        workspaceId
      );

      if (!member || !member.isActive) {
        throw new AppError('workspace.access.memberRequired');
      }

      // request에 workspaceMemberId 추가
      request.workspaceMemberId = member.id;

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('workspace.access.denied');
    }
  }
}
