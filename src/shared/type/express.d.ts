import { AccessTokenPayload } from './token.type';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      apiVersion?: string;
      user?: AccessTokenPayload;
      workspaceId?: string;
    }
  }
}

export {};
