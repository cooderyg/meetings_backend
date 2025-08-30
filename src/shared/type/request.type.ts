import { Request } from 'express';
import { AccessTokenPayload } from './token.type';

export interface IRequest extends Request {
  user?: AccessTokenPayload;
  workspaceId?: string;
  workspaceMemberId?: string;
}
