import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export class WorkspaceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { workspaceId } = req.params;

    if (workspaceId) {
      req.workspaceId = workspaceId;
    }

    next();
  }
}
