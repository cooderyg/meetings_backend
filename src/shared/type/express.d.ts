declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      apiVersion?: string;
      user?: JwtPayload;
    }
  }
}

export {};
