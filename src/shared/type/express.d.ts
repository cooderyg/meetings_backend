declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      apiVersion?: string;
    }
  }
}

export {};
