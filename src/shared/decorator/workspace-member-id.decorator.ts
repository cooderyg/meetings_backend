import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WorkspaceMemberId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspaceMemberId;
  }
);