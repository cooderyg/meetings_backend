import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequest } from '../type/request.type';
import { AccessTokenPayload } from '../type/token.type';

export const UserInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<IRequest>();
    return request.user as AccessTokenPayload;
  }
);
