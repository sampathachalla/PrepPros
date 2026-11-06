import { Router } from 'express';
import { MemoryStore, rateLimit } from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import * as bookmarkController from '../bookmarks/controller.js';
import * as recipeController from '../recipes/controller.js';
import { requireAgentTools } from './agentTools.js';
import * as controller from './controller.js';

// In-process counters: fine for a single API container; use a shared store if the API is scaled out
const chatMessages = new MemoryStore();

/** Clears all counters (used between tests). */
export function resetChatRateLimits() {
  chatMessages.resetAll();
}

/** Each message runs a paid model, so cap messages per user. */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  store: chatMessages,
  keyGenerator: (req) => req.userId ?? '',
  message: { detail: 'You’re sending messages too quickly, please wait a moment.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const chatRoutes = Router();

chatRoutes.post('/research', controller.research);
chatRoutes.post('/chat/messages', requireAuth, messageLimiter, controller.sendMessage);

/** Called by the PrepPros MCP tools in the Hermes container, acting for the user a chat ticket names. */
const agentToolRoutes = Router();
agentToolRoutes.use(requireAgentTools);
agentToolRoutes.get('/recipes', recipeController.list);
agentToolRoutes.get('/recipes/:id', recipeController.getById);
agentToolRoutes.put('/recipes/:id/bookmark', recipeController.bookmark);
agentToolRoutes.get('/bookmarks', bookmarkController.list);

chatRoutes.use('/chat/tools', agentToolRoutes);
