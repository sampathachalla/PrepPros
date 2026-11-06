declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth` from the access token's subject. */
      userId?: string;
    }
  }
}

export {};
