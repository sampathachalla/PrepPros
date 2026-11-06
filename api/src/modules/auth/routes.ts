import { Router, type Request } from 'express';
import { ipKeyGenerator, MemoryStore, rateLimit } from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const tooManyAttempts = { detail: 'Too many attempts, please try again later.' };
const clientIp = (req: Request) => ipKeyGenerator(req.ip ?? '');

// In-process counters: fine for a single API container; use a shared store if the API is scaled out
const loginAttempts = new MemoryStore();
const signupAttempts = new MemoryStore();
const resendAttempts = new MemoryStore();

/** Clears all counters (used between tests). */
export function resetAuthRateLimits() {
  loginAttempts.resetAll();
  signupAttempts.resetAll();
  resendAttempts.resetAll();
}

/** Failed logins per device and account; successful logins don't count. */
const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  store: loginAttempts,
  keyGenerator: (req) => `${clientIp(req)}:${String(req.body?.identifier ?? '').trim().toLowerCase()}`,
  message: tooManyAttempts,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

/** New accounts per device. */
const signupLimiter = rateLimit({
  windowMs: 4 * FIFTEEN_MINUTES,
  limit: 20,
  keyGenerator: clientIp,
  store: signupAttempts,
  message: tooManyAttempts,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

/** Confirmation emails per device and account; Supabase's sending allowance is small. */
const resendLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  store: resendAttempts,
  keyGenerator: (req) => `${clientIp(req)}:${String(req.body?.identifier ?? '').trim().toLowerCase()}`,
  message: tooManyAttempts,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const authRoutes = Router();

authRoutes.post('/signup', signupLimiter, controller.signup);
authRoutes.post('/login', loginLimiter, controller.login);
authRoutes.post('/resend-confirmation', resendLimiter, controller.resendConfirmation);
authRoutes.post('/refresh', controller.refresh);
authRoutes.post('/logout', requireAuth, controller.logout);
