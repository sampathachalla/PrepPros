import type { Request, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

/** Requires `Authorization: Bearer <token>` and sets `req.userId`. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  try {
    req.userId = await verifyAccessToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
  next();
};

/**
 * Like `requireAuth`, but a request with no token at all acts as TEMP_USER_ID when that is set. A token
 * that is sent is always checked, so an expired session gets a 401 rather than someone else's data.
 */
export const requireAuthOrTempUser: RequestHandler = async (req, res, next) => {
  if (!req.headers.authorization && env.TEMP_USER_ID) {
    req.userId = env.TEMP_USER_ID;
    next();
    return;
  }
  await requireAuth(req, res, next);
};

/** The authenticated user's id; only valid on routes behind `requireAuth`. */
export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Authentication required');
  }
  return req.userId;
}
