import { Router } from 'express';
import { MemoryStore, rateLimit } from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

// In-process counters: fine for a single API container; use a shared store if the API is scaled out
const joinAttempts = new MemoryStore();
const addMemberAttempts = new MemoryStore();

export function resetHouseholdRateLimits() {
  joinAttempts.resetAll();
  addMemberAttempts.resetAll();
}

/** Stops anyone guessing invite codes. */
const joinLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  store: joinAttempts,
  keyGenerator: (req) => req.userId ?? '',
  message: { detail: 'Too many tries, please wait a moment.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

/** Each try shows whether an email has an account; a household only has a few places to fill. */
const addMemberLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  store: addMemberAttempts,
  keyGenerator: (req) => req.userId ?? '',
  message: { detail: 'Too many tries, please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const householdRoutes = Router();

householdRoutes.use(requireAuth);
householdRoutes.get('/', controller.get);
householdRoutes.post('/', controller.create);
householdRoutes.patch('/', controller.update);
householdRoutes.post('/join', joinLimiter, controller.join);
householdRoutes.post('/leave', controller.leave);
householdRoutes.post('/invite/reset', controller.resetInvite);
householdRoutes.post('/members', addMemberLimiter, controller.addMember);
householdRoutes.delete('/members/:userId', controller.removeMember);
householdRoutes.post('/members/:userId/admin', controller.makeAdmin);
