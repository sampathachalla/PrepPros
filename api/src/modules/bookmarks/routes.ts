import { Router } from 'express';
import { MemoryStore, rateLimit } from 'express-rate-limit';
import { requireAuthOrTempUser } from '../../middleware/auth.js';
import * as controller from './controller.js';

// In-process counters: fine for a single API container; use a shared store if the API is scaled out
const imports = new MemoryStore();

export function resetBookmarkRateLimits() {
  imports.resetAll();
}

/** Every new Instagram link is a paid Bright Data request. */
const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  store: imports,
  keyGenerator: (req) => req.userId ?? '',
  message: { detail: 'You’re importing links too quickly, please wait a moment.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const bookmarkRoutes = Router();

bookmarkRoutes.use(requireAuthOrTempUser);
bookmarkRoutes.get('/', controller.list);
bookmarkRoutes.post('/', controller.create);
bookmarkRoutes.post('/import', importLimiter, controller.importLink);
bookmarkRoutes.post('/preview', controller.preview);
bookmarkRoutes.get('/:id', controller.getById);
bookmarkRoutes.post('/:id/retry', importLimiter, controller.retryImport);
bookmarkRoutes.delete('/:id', controller.remove);
